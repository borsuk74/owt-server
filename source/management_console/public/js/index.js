// Copyright (C) <2019> Intel Corporation
//
// SPDX-License-Identifier: Apache-2.0

'use strict';

var restApi;
var mode = "";
var metadata;
var roomId = "";
var forwardStreams = new Array();
var recordings = new Array();

var ENUMERATE = {
  SERVICE: "service",
  ROOM: "room",
  RUNTIME: "runtime"
};
var serviceId = "";
var serviceKey = "";

var roomTotal = 1;

function checkProfile(callback) {
  var serviceId = getCookie('serviceId') === '' ? top.serviceId : getCookie('serviceId');
  var serviceKey = getCookie('serviceKey') === '' ? top.serviceKey : getCookie('serviceKey');
  top.serviceId = serviceId;
  $('#inputId').val(serviceId);
  $('#inputKey').val(serviceKey);
  if (serviceId === '' || serviceKey === '') {
    $('#myModal').modal('show');
    return;
  }
  restApi = ManagementApi.init(serviceId, serviceKey);
  restApi.getService(serviceId, function (err, text) {
    if (err) {
      notify('error', 'Failed to get service information', err);
    } else {
      var myService = JSON.parse(text);
      roomTotal = myService.rooms.length;
    }
    judgePermissions();
    callback();
  });
}

$('button#clearCookie').click(function() {
  document.cookie = 'serviceId=; expires=Thu, 01 Jan 1970 00:00:00 UTC';
  document.cookie = 'serviceKey=; expires=Thu, 01 Jan 1970 00:00:00 UTC';
  document.getElementById("inputId").value = "";
  document.getElementById("inputKey").value = "";
});

$('button#saveServiceInfo').click(function() {
  serviceId = $('.modal-body #inputId').val();
  serviceKey = $('.modal-body #inputKey').val();
  var rememberMe = $('.modal-body .checkbox input').prop('checked');
  if (serviceId !== '' && serviceKey !== '') {
    if (rememberMe) {
      setCookie('serviceId', serviceId, 365);
      setCookie('serviceKey', serviceKey, 365);
    }
    restApi = ManagementApi.init(serviceId, serviceKey);
    judgePermissions();
  }
  if (restApi) {
    $("#myModal").modal("hide");
  }
});

function judgePermissions() {
  restApi.getServices(function(err, text) {
    if (!err) {
      $(".li").removeClass("hideLi");
    } else {
      $(".li:not(.normal)").addClass("hideLi").removeClass("active");
      $(".li.normal").addClass("active");
      $(".overview").hide();
      $(".room").show();
      $(".runtime").hide();
      $(".page-header").text("Rooms in current Service");
      mode = ENUMERATE.ROOM;
    }
  });
}

function a_click(nowList, dom) {
  var service = $(".overview");
  var room = $(".room");
  var runtime = $(".runtime");
  var nowLI = $(dom.parentNode);
  var title = $(".page-header");
  if (nowLI.hasClass("active")) {
    return;
  } else {
    $(".li").removeClass("active");
    nowLI.addClass("active");
  }
  switch (nowList) {
    case ENUMERATE.SERVICE:
      title.text("Services");
      checkProfile(renderService);
      break;
    case ENUMERATE.ROOM:
      title.text("Rooms in current Service");
      checkProfile(renderRoom);
      break;
    case ENUMERATE.RUNTIME:
      title.text("MCU runtime");
      checkProfile(renderCluster);
      break;
  }
}


function record_click() {
    var i;
    recordings = new Array();
     for (i = 0; i< forwardStreams.length; i++) {
      restApi.recordStream(roomId, "auto", forwardStreams[i], forwardStreams[i], (err,resp)=>{
         if (err) {
            return notify('error', 'Failed to start recording', err);
       } else {
           var recording = JSON.parse(resp);
           recordings.push(recording);
         }//end else
      });
    }//end for
}

function record_click_mp4() {
    var i;
    recordings = new Array();
     for (i = 0; i< forwardStreams.length; i++) {
      restApi.recordStreamMp4(roomId,  forwardStreams[i], forwardStreams[i], (err,resp)=>{
         if (err) {
            return notify('error', 'Failed to start recording', err);
       } else {
           var recording = JSON.parse(resp);
           recordings.push(recording);
         }//end else
      });
    }//end for
}


function stop_record_click() {
   if (restApi ==='undefined') {
      return;
      } else {
        //get all available recordings for current room
        restApi.getRecordings(roomId, (err,resp) => {
        if (err) {
        return notify('error', 'Failed to get recordings', err);
        } else {
        let recordingsObject = JSON.parse(resp);
        var i;
        recordings = new Array();
        for (i = 0; i < recordingsObject.length; i++){
            recordings.push(recordingsObject[i].id);
            }
        //check if there are some recordings here
	     if (recordings.length > 0){
         var i = 0;
         for(i=0;i<recordings.length;i++){
           restApi.stopRecording(roomId, recordings[i], (err,resp)=>{
           if (err) {
            return notify('error', 'Failed to stop recording', err);
            } else {
             var r = resp;
               }//end else
              });
             }//end for
            }//end if
           }//end else
        });
     }//end else
}


function get_streams_click() {
  
  if (restApi ==='undefined') { 

    return;

    }else{
     // get roomId (assuming there is just one)
     restApi.listRooms((err,resp)=>{
       if (err) {
        return notify('error', 'Failed to list rooms', err);
       } else {
        let roomObject = JSON.parse(resp);
        roomId = roomObject[0]._id;
        // get forward streams
        restApi.getStreams(roomId, (err, resp) => {
          if (err) {
            return notify('error', 'Failed to get streams', err);
          }
         let streams = JSON.parse(resp);
         var i;
         forwardStreams = new Array();
         for (i = 0; i < streams.length; i++){
           if ( streams[i].type === 'forward') {
              forwardStreams.push(streams[i].id);
            }
          }      
         });        
       }//end else
      }); 
  }//end else
}

var login = new Promise((resolve, reject) => {
  $(".close").on("click", function() {
    if (serviceId === '' || serviceKey === '') {
      return;
    } else {
      $("#myModal").modal("hide");
    }
  });
  checkProfile(()=>resolve());
});
