/////////// begin WGS84 to GCJ-02 transformer /////////
var WGS84transformer = function() {};
// Krasovsky 1940
//
// a = 6378245.0, 1/f = 298.3
// b = a * (1 - f)
// ee = (a^2 - b^2) / a^2;
WGS84transformer.prototype.a = 6378245.0;
WGS84transformer.prototype.ee = 0.00669342162296594323;

WGS84transformer.prototype.transform = function(wgLat, wgLng) {
    if(this.isOutOfChina(wgLat, wgLng))
        return {lat: wgLat, lng: wgLng};
    dLat = this.transformLat(wgLng - 105.0, wgLat - 35.0);
    dLng = this.transformLng(wgLng - 105.0, wgLat - 35.0);
    radLat = wgLat / 180.0 * Math.PI;
    magic = Math.sin(radLat);
    magic = 1 - this.ee * magic * magic;
    sqrtMagic = Math.sqrt(magic);
    dLat = (dLat * 180.0) / ((this.a * (1 - this.ee)) / (magic * sqrtMagic) * Math.PI);
    dLng = (dLng * 180.0) / (this.a / sqrtMagic * Math.cos(radLat) * Math.PI);
    mgLat = wgLat + dLat;
    mgLng = wgLng + dLng;
    return {lat: mgLat, lng: mgLng};
};

WGS84transformer.prototype.isOutOfChina = function(lat, lng) {
    if(lng < 72.004 || lng > 137.8347) return true;
    if(lat < 0.8293 || lat > 55.8271) return true;
    return false;
};

WGS84transformer.prototype.transformLat = function(x, y) {
    var ret = -100.0 + 2.0 * x + 3.0 * y + 0.2 * y * y + 0.1 * x * y + 0.2 * Math.sqrt(Math.abs(x));
    ret += (20.0 * Math.sin(6.0 * x * Math.PI) + 20.0 * Math.sin(2.0 * x * Math.PI)) * 2.0 / 3.0;
    ret += (20.0 * Math.sin(y * Math.PI) + 40.0 * Math.sin(y / 3.0 * Math.PI)) * 2.0 / 3.0;
    ret += (160.0 * Math.sin(y / 12.0 * Math.PI) + 320 * Math.sin(y * Math.PI / 30.0)) * 2.0 / 3.0;
    return ret;
};

WGS84transformer.prototype.transformLng = function(x, y) {
    var ret = 300.0 + x + 2.0 * y + 0.1 * x * x + 0.1 * x * y + 0.1 * Math.sqrt(Math.abs(x));
    ret += (20.0 * Math.sin(6.0 * x * Math.PI) + 20.0 * Math.sin(2.0 * x * Math.PI)) * 2.0 / 3.0;
    ret += (20.0 * Math.sin(x * Math.PI) + 40.0 * Math.sin(x / 3.0 * Math.PI)) * 2.0 / 3.0;
    ret += (150.0 * Math.sin(x / 12.0 * Math.PI) + 300.0 * Math.sin(x / 30.0 * Math.PI)) * 2.0 / 3.0;
    return ret;
};
/////////// end WGS84 to GCJ-02 transformer /////////

var app = {
    // Application Constructor
    initialize: function() {
        document.addEventListener('deviceready', this.onDeviceReady, false);
        // init map view
        app.map = new AMap.Map('map_container');
        app.map.plugin('AMap.Scale', function() {
            app.map.addControl(new AMap.Scale());
        });
        app.map.markers = [];
        // init geolocation
        app.map.plugin('AMap.Geolocation', function() {
            app.geolocation = new AMap.Geolocation({
                enableHighAccuracy: true,
                timeout: 5000,
                buttonPosition: 'RT',
                showCircle: false,
                panToLocation: false
            });
            app.map.addControl(app.geolocation);
            app.geolocation.firstFix = true;
            app.geolocation.watchPosition();
            AMap.event.addListener(app.geolocation, 'complete', function(result) {
                app.geolocation.position = result.position;
                app.calcDistance();
                if (app.geolocation.firstFix) {
                    app.map.setZoomAndCenter(16, result.position);
                    app.geolocation.firstFix = false;
                }
            });
        });
    },

    calcDistance: function() {
        $('.distance').each(function() {
            var newpos = new WGS84transformer().transform(Number($(this).attr('data:lat')), Number($(this).attr('data:lng')));
            $(this).html(Math.ceil(app.geolocation.position.distance([newpos.lng, newpos.lat])) + 'm');
        });
    },

    // deviceready Event Handler
    //
    // The scope of 'this' is the event. In order to call the 'receivedEvent'
    // function, we must explicitly call 'app.receivedEvent(...);'
    onDeviceReady: function() {

    }
};

$(function() {
    // init nav bar
    $('#nav').find('div').tap(function() {
        if ($(this).hasClass('activate')) return;
        $('#nav').find('div').removeClass('activate');
        $(this).addClass('activate');
        $('.container').hide();
        switch ($(this).attr('id')) {
            case 'nav_map':
                $('#map_container').show();
                break;
            case 'nav_mission':
                $('#mission_container').show();
                break;
            case 'nav_route':
                $('#route_container').show();
                break;
        }
    });
    // init mission search
    $('#btn_mission_search').tap(function() {
        $('#mission_list').html('Loading…');
        $.getJSON('http://ingressmm.com/get_mission.php?find='+$('#input_mission_name').val()+'&findby=0', function(result) {
            $('#mission_list').html('');
            if (result.mission.length == 0) {
                $('#mission_list').html('No Result');
            } else for (var key in result.mission) {
                var mission = result.mission[key];
                var sequence = '';
                if (mission.sequence == '1') {
                    sequence = 'Seq';
                } else if (mission.sequence == '2') {
                    sequence = 'Any';
                }
                var content = '<div class="mission" data:missionid="' + mission.id + '"><div class="mission_icon"><img src="http://ingressmm.com/icon/' + mission.code + '.jpg" /></div><div class="mission_title">' + mission.name + '</div><div>' + sequence + ' <span class="distance" data:lat="' + mission.latitude + '" data:lng="' + mission.longitude + '"></span></div></div>';
                $('#mission_list').append(content);
            }
            app.calcDistance();
        });
    });
    // init mission list
    $('#mission_list').on('tap', '.mission', function() {
        //alert($(this).attr('data:missionid'));
        $('#mission_detail_info').html($(this).html());
        $('#mission_search').hide();
        $('#mission_detail').show();
        $('#btn_show_map').hide();
        $('#mission_detail_waypoints').html('Loading mission waypoints…');
        $.getJSON('http://ingressmm.com/get_portal.php?mission='+$(this).attr('data:missionid'), function(result) {
            $('#mission_detail_waypoints').html('');
            app.current_mission = result;
            if (result.portal.length == 0) {
                $('#mission_detail_waypoints').html('Get portals failed…');
            } else for (var i = 0; i < result.portal.length; i++) {
                var waypoint = result.portal[i];
                var content = '<div class="waypoint"><div class="waypoint_name">' + (i+1) + '. ';
                if (waypoint[0]) {
                    content = content + 'Waypoint Hidden' + '</div>';
                } else {
                    content = content + waypoint[2].name + '</div>';
                }
                var task_list = [
                    "",
                    "Hack this Portal",
                    "Capture or Upgrade Portal",
                    "Create Link from Portal",
                    "Create Field from Portal",
                    "Install a Mod on this Portal",
                    "Enter the Passphrase",
                    "View this Field Trip Waypoint",
                    "Enter the Passphrase"
                ];
                if (!waypoint[0]) {
                    content = content + '<div>' + task_list[waypoint[1]] + '</div>' + '<div><span class="distance" data:lat="' + waypoint[2].latitude + '" data:lng="' + waypoint[2].longitude + '"></span> <a href="javascript:">Walk</a> <a href="javascript:">Drive</a> <a href="javascript:">Transit</a></div>';
                }
                content = content + '</div>';
                $('#mission_detail_waypoints').append(content);
            }
            $('#btn_show_map').show();
            app.calcDistance();
        });
    });
    // init mission detail
    $('#btn_detail_back').tap(function() {
        if (app.transport) {
            app.transport.clear();
        }
        $('#mission_detail').hide();
        $('#mission_search').show();
    });
    $('#btn_show_map').tap(function() {
        app.map.remove(app.map.markers);
        for (var i = 0; i < app.current_mission.portal.length; i++) {
            var waypoint = app.current_mission.portal[i];
            if (waypoint[0]) continue;
            var newpos = new WGS84transformer().transform(waypoint[2].latitude, waypoint[2].longitude);
            var marker = new AMap.Marker({
                map: app.map,
                position: [newpos.lng, newpos.lat],
                offset: new AMap.Pixel(-16, -16),
                icon: 'https://ingressmm.com/img/p' + (Array(2).join(0)+(i+1)).slice(-2) + 'n.png'
            });
            app.map.markers.push(marker);
            if (i == 0) {
                app.map.setZoomAndCenter(16, [newpos.lng, newpos.lat]);
            }
        }
        $('#nav_map').tap();
    });
    $('#mission_detail_waypoints').on('tap', 'a', function() {
        var _this = $(this);
        AMap.service(['AMap.Walking', 'AMap.Driving', 'AMap.Transfer'], function() {
            var param = {
                map: app.map,
                panel: 'route_container'
            };
            if (app.transport) {
                app.transport.clear();
            }
            switch (_this.html()) {
                case 'Walk':
                    app.transport = new AMap.Walking(param);
                    break;
                case 'Drive':
                    app.transport = new AMap.Driving(param);
                    break;
                case 'Transit':
                    app.transport = new AMap.Transfer(param);
                    break;
            }
            var target = _this.parent().find('.distance');
            var target_pos = new WGS84transformer().transform(Number(target.attr('data:lat')), Number(target.attr('data:lng')));
            app.transport.search(app.geolocation.position, [target_pos.lng, target_pos.lat]);
        });
    });
    // init app
    app.initialize();
});