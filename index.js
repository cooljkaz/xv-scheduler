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
     animation: 150,
     sort: false // To disable sorting: set sort to false
   });

   new Sortable($('#Playlist')[0], {
      group: 'shared',
      animation: 150
  });

   window.bridge.on('get-sequences-xlights-reply', (event, sequenceObj) => {
      XlightsLoaded = true;
      console.log(sequenceObj);
      var html = '';
      sequenceObj.forEach(function(sequence) {
         html+='<tr><td>' + sequence.name + '</td></tr>';
      })
      
      $('#XlightsSequences').html(html);

   });

   window.bridge.on('get-sequences-vixen-reply', (event, sequenceObj) => {
      VixenLoaded = true;
      console.log(sequenceObj);
      var html = '';
      sequenceObj.forEach(function(sequence) {
         html+='<tr><td>' + sequence.name + '</td></tr>';
      })
      
      $('#VixenSequences').html(html);
   });

   window.bridge.on('xlights-status-reply', (event, status) => {
      handleXlightsStatus(status);
   });

   window.bridge.on('vixen-status-reply', (event, status) => {
      handleVixenStatus(status);
   });

   window.bridge.on('playlist-reply', (event, playlist) => {
      console.log(playlist);
   });

   window.bridge.on('xlights-active-reply', (event, status) => {
      console.log(status);
   });

   window.bridge.on('xlights-play-reply', (event, status) => {
      console.log(status);
   });

   window.bridge.on('get-status-reply', (event, global) => {
      
      console.log(global);

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

      timer = setTimeout(checkForNext, 3000);

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

function checkForNext() {
   window.bridge.getStatus();
}


