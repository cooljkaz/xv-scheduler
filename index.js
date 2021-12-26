let timer;
let VixenLoaded, XlightsLoaded = false;
let VixenSequences = [];
let XlightsSequences = [];

var handleXlightsStatus = function(status) {
   console.log(status);
}

var handleVixenStatus = function(status) {
   console.log(status);
}

$(function() {

   window.bridge.getStatus();
   window.bridge.getPlaylist();
   window.bridge.getSchedules();

   $('.day-button').on("click", function() {
      $(this).toggleClass('selected');
   });


   $('.scheduler-input').timepicker({
      timeFormat:'H:i',
      minuteStep : 15
   });

   $('#PlaylistSchedule .ui.toggle.checkbox').checkbox({
      onChecked: function() {
         $('#PlaylistSchedule').removeClass('grey').addClass('blue');
      },
      onUnchecked: function() {
         $('#PlaylistSchedule').removeClass('blue').addClass('grey');
      }
   });

   $('#ScheduleEnabled').on('change', SaveSchedules);
   $('.day-button').on('click', SaveSchedules);
   $('.scheduler-input').on('change', function() {
      setTimeout( SaveSchedules, 3000)
   });


   new Sortable($('#VixenSequences')[0], {
      group: {
          name: 'shared',
          pull: 'clone',
          put: false // Do not allow items to be put into this list
      },
      animation: 150,
      sort: false // To disable sorting: set sort to false
  });

  new Sortable($('#XlightsSequences')[0], {
     group: {
         name: 'shared',
         pull: 'clone',
         put: false // Do not allow items to be put into this list
     },
     animation: 0,
     sort: false // To disable sorting: set sort to false
   });

   new Sortable($('#Playlist')[0], {
      group: 'shared',
      animation: 0,
      onSort: function() {
         console.log('sort event');
         UpdatePlaylist();
      },
      
  });

   window.bridge.on('get-sequences-xlights-reply', (event, sequenceObj) => {
      
      XlightsLoaded = true;
      XlightsSequences = sequenceObj;

      console.log(sequenceObj);

      BindSequences('#XlightsSequences', sequenceObj);

   });

   window.bridge.on('get-sequences-vixen-reply', (event, sequenceObj) => {
      
      VixenLoaded = true;
      VixenSequences = sequenceObj;

      console.log(sequenceObj);
      
      BindSequences('#VixenSequences', sequenceObj);


   });

   window.bridge.on('get-playlist-reply', (event, playlist) => {

      BindSequences('#Playlist', playlist);
      console.log(playlist);
      

      UpdatePlaylist();
   });

   window.bridge.on('get-schedules-reply', (event, schedules) => {

       console.log(schedules);

       if(schedules && schedules.length > 0) {

         schedules.forEach(function(schedule) {
            
            $('.day-button').removeClass('selected');
            schedule.daysOfWeek.forEach(function(day) {
               $('#Day' + day).addClass('selected');
            });

            $('#ScheduleStart').val(schedule.start);
            $('#ScheduleEnd').val(schedule.end);
            $('#ScheduleEnabled').prop('checked', schedule.enabled);
            if(schedule.enabled) {
               $('#PlaylistSchedule').removeClass('grey').addClass('blue');
            }

         });

       }
      
   });

   window.bridge.on('save-playlist-reply', (event, err) => {
      
      $('#PlaylistContainer').addClass('blue').removeClass('grey');
      console.log(err);
   });

   window.bridge.on('xlights-active-reply', (event, status) => {
      console.log(status);
   });

   window.bridge.on('xlights-play-reply', (event, status) => {
      console.log(status);
   });

   window.bridge.on('get-status-reply', (event, global) => {
      
      // console.log(global);

      if(global) {

         var vixenError = false;
         switch (global.vixen.status) {

            case 'idle' :
               $('#VixenHeader').removeClass('red').removeClass('green').addClass('grey');
               break;
               
            case 'playing' :
               $('#VixenHeader').removeClass('red').removeClass('grey').addClass('green');
               break;

            case 'error' :
               vixenError = true;
               $('#VixenHeader').removeClass('green').removeClass('grey').addClass('red');
               break;

         }

         $('#VixenStatus').html(global.vixen.status);

         if(!VixenLoaded && !vixenError) {
            bridge.getVixenSequences();
         }

         var xlightsError = false;
         
         switch (global.xlights.status) {

            case 'idle' :
               $('#XlightsHeader').removeClass('red').removeClass('green').addClass('grey');
               break;
            case 'playing' :
               $('#XlightsHeader').removeClass('red').removeClass('grey').addClass('green');
               break;
            case 'error' :
               xlightsError = true;
               $('#XlightsHeader').removeClass('green').removeClass('grey').addClass('red');
               break;

         }

         if(!XlightsLoaded && !xlightsError) {
            bridge.getXlightsSequences();
         }

         $('#XlightsStatus').html(global.xlights.status);

      }

      if(timer)
         clearTimeout(timer);

      timer = setTimeout(CheckForNext, 3000);

   });

   $('#Start').on('click', function() {
      window.bridge.play(0);
   });

   $('#GlobalStatus').on("click",
      function() {
         window.bridge.getStatus();
      }
   );

   $('#XlightsStatus').on("click",
      function() {
         window.bridge.getXlightsStatus();
      }
   );
   $('#VixenStatus').on("click",
      function() {
         window.bridge.getVixenStatus();
      }
   );

   $('#GetPlaylist').on("click", function() {
      window.bridge.getPlaylist();
   });

});

function SaveSchedules() {
   
   var schedules = [];
   var schedule = {daysOfWeek:[]};
   
   $('.day-button').each(function() {
      if($(this).hasClass('selected')) {
         schedule.daysOfWeek.push($(this).attr('data-index')*1);
      }
   });

   schedule.start = $('#ScheduleStart').val();
   schedule.end = $('#ScheduleEnd').val();
   schedule.enabled = $('#ScheduleEnabled').prop('checked');

   schedules.push(schedule);

   bridge.saveSchedules(schedules);

}

function SavePlaylist() {
   var playlist = [];
      
   $('#Playlist').children('tr').each(function(idx, item) {
      var sequencer = $(item).attr('data-type');
      var sequenceData = $(item).attr('data-sequence');

      if(sequenceData)
         playlist.push(JSON.parse(decodeURIComponent(sequenceData)));
   });

   console.log(playlist);
   
   $('#PlaylistContainer').addClass('grey').removeClass('blue');
   bridge.savePlaylist(playlist);
}

function UpdatePlaylist() {

   var numChildren = $('#Playlist').children().length;

   if(numChildren == 0) {
      $('#PlaylistContainer').addClass('grey').removeClass('blue');
      $('#Playlist').html('<tr id="PlaylistInstruction"><td>Drag and drop items here from Vixen and xLights to add to your playlist.</td></tr>');
   } else if (numChildren > 1) {
      $('#PlaylistContainer').addClass('blue').removeClass('grey');
      $('#PlaylistInstruction').remove();
   }

   $('.delete').off('click').on('click', function() {
      
      $(this).parent().parent().remove();
      UpdatePlaylist();

   });

   SavePlaylist();


}

function BindSequences(containerId, sequences) {

   var source = document.getElementById("sequence-template").innerHTML;
   var template = Handlebars.compile(source);

   $(containerId).html(template(sequences));

}

function CheckForNext() {
   window.bridge.getStatus();
}


