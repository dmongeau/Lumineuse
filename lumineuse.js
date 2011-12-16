/*
 *
 * Lumineuse
 *
 * Display one or many images using google maps
 *
 * @author David Mongeau-Petitpas <dmp@ecoutez.ca>
 * @version 0.1
 *
 */
var Lumineuse = function(el,images,opts) {
	
	this.opts = jQuery.extend({
		'center' : {
			'x':500,
			'y':275
		},
		'tileSize' : 256,
		'currentZoom' : 0,
		'maxZoom' : 3,
		'load' : function(){},
		'render' : function(){},
		'drag' : function(){},
		'dragstart' : function(){},
		'dragend' : function(){},
		'zoom_changed' : function(){},
	},opts);
	
	this.map = null;
	this.el = el;
	this.images = images;
	this.size = Math.ceil(Math.sqrt(this.images.length));
	
	this.currentZoom = this.opts.currentZoom;
	this.isDragging = false;
	this.renderWhenLoaded = false;
	this.loaded = false;
	
	if(typeof(google) == 'undefined' || !google.maps) {
		var self = this;
		var origCallback = function(){};
		if(typeof(window['initializeMap']) == 'function') {
			origCallback = window['initializeMap'];
		}
		window['initializeMap'] = function() {
			origCallback();
			self.onLoad.call(self);
		};
		Lumineuse.loadScript('initializeMap');
	} else {
		this.loaded = true;
	}
};

/*
 *
 * onLoad event
 *
 */
Lumineuse.prototype.onLoad = function() {

	this.loaded = true;
	
	this.opts.load.call(this);
	
	if(this.renderWhenLoaded) {
		this.renderWhenLoaded = false;
		this.render();
	}

};

/*
 *
 * Render canvas
 *
 */
Lumineuse.prototype.render = function() {
	
	if(!this.loaded) {
		this.renderWhenLoaded = true;
		return;
	}
	
	if(!this.map) {
		this.map = new google.maps.Map(this.el, {
			zoom: this.currentZoom,
			mapTypeControlOptions: {
				mapTypeIds: ['canvas']
			},
			overviewMapControl: false,
			streetViewControl: false
		});
	}

	this.mapType = new Lumineuse.MapType("Lumineuse",this.images,{
		'maxZoom' : this.opts.maxZoom,
		'tileSize' : this.opts.tileSize
	});
	
	this.map.mapTypes.set('canvas', this.mapType);
	this.map.setMapTypeId('canvas');
	this.map.overlayMapTypes.insertAt(0, this.mapType);
	
	var self = this;
	
	google.maps.event.addListener(this.map,"zoom_changed",function() {
		self.currentZoom = self.map.getZoom();
		self.opts.zoom_changed.call(self);
	});
	
	google.maps.event.addListener(this.map,"dragstart",function() {
		self.isDragging = true;
		self.opts.dragstart.call(self);
	});
	
	google.maps.event.addListener(this.map,"drag",function() {
		self.checkBounds.call(self);
		self.opts.drag.call(self,self.map.getCenter());
	});
	
	google.maps.event.addListener(this.map,"dragend",function() {
	
		self.isDragging = false;
		self.checkBounds.call(self);
	
		var centerLatLng = self.map.getCenter();
		var centerXY = self.map.getProjection().fromLatLngToPoint(centerLatLng);
		self.opts.dragend.call(self,centerLatLng);
		
	});
	
	google.maps.event.addListener(this.map,"mousemove",function() {
		if(self.isDragging) {
			self.checkBounds.call(self);
		}
	});
	
	google.maps.event.addListener(this.map,"projection_changed",function() {
		if(self.opts.center.x) {
			var center = self.map.getProjection().fromPointToLatLng(new google.maps.Point(self.opts.center.x,self.opts.center.y));
		} else {
			var center = new google.maps.LatLng(self.opts.center.lat,self.opts.center.lng);
		}
		self.map.setCenter(center);
	});
	
	this.opts.render.call(this);

};

/**
 *
 * Prevent dragging outside of the canvas
 *
 */
Lumineuse.prototype.checkBounds = function() {

	var point = this.map.getProjection().fromLatLngToPoint(this.map.getCenter());
	if(point.x < 0 && point.y < 0) {
		this.map.setCenter(this.map.getProjection().fromPointToLatLng(new google.maps.Point(0,0)));
	} else if(point.x < 0) {
		this.map.setCenter(this.map.getProjection().fromPointToLatLng(new google.maps.Point(0,point.y)));
	} else if(point.y < 0) {
		this.map.setCenter(this.map.getProjection().fromPointToLatLng(new google.maps.Point(point.x,0)));
	}
	
	var max = (this.opts.tileSize*this.size);
	if(point.x > max && point.y > max) {
		this.map.setCenter(this.map.getProjection().fromPointToLatLng(new google.maps.Point(max,max)));
	} else if(point.x > max) {
		this.map.setCenter(this.map.getProjection().fromPointToLatLng(new google.maps.Point(max,point.y)));
	} else if(point.y > max) {
		this.map.setCenter(this.map.getProjection().fromPointToLatLng(new google.maps.Point(point.x,max)));
	}

};

/**
 *
 * Get / Set map
 *
 */
Lumineuse.prototype.getMap = function() {
	return this.map;
};

Lumineuse.prototype.setMap = function(map) {
	this.map = map;
};

/*
 *
 * Load google maps script
 *
 */
Lumineuse.loadScript = function(callback) {
	var script = document.createElement("script");
	script.type = "text/javascript";
	script.src = "http://maps.googleapis.com/maps/api/js?sensor=false&v=3&callback="+escape(callback);
	document.body.appendChild(script);
};

/*
 *
 * Map projection
 *
 */
Lumineuse.Projection = function(tileSize,size) {
	this.tileSize = tileSize;
	this.size = size;
	this.max = this.tileSize*this.size;
};
Lumineuse.Projection.prototype.fromLatLngToPoint = function(latLng) {

	var x = this.max * (latLng.lat() / this.size);
	var y = this.max * (latLng.lng() / this.size);
	
	return new google.maps.Point(x, y);

};
Lumineuse.Projection.prototype.fromPointToLatLng = function(point, noWrap) {
	
	var lat = (point.x / this.max) * this.size;
	var lng = (point.y / this.max) * this.size;
	
	return new google.maps.LatLng(lat, lng, noWrap);

};

/*
 *
 * Map type
 *
 */
Lumineuse.MapType = function(name,images,opts) {

	this.opts = jQuery.extend({
		'minZoom' : 0,
		'maxZoom' : 3,
		'tileSize' : 256
	},opts);
	
	this.tileSize = new google.maps.Size(this.opts.tileSize,this.opts.tileSize);
	this.maxZoom = this.opts.maxZoom;
	this.minZoom = this.opts.minZoom;
	this.name = name;

	this.images = images;
	this.size = Math.ceil(Math.sqrt(this.images.length));
	this.projection = new Lumineuse.Projection(this.opts.tileSize,this.size);
	
};
Lumineuse.MapType.prototype.tileSize = null;
Lumineuse.MapType.prototype.maxZoom = null;
Lumineuse.MapType.prototype.minZoom = null;
Lumineuse.MapType.prototype.name = null;
Lumineuse.MapType.prototype.projection = null;
Lumineuse.MapType.prototype.getTile = function(coord, zoom, ownerDocument) {

	var $tile = $('<div class="tile"></div>').css({
		'width' : this.opts.tileSize+'px',
		'height' : this.opts.tileSize+'px'
	});
	
	var tilesCount = Math.pow(2,zoom);
	var max = tilesCount*this.size;
	
	coord.x = coord.x;
	coord.y = coord.y;
	
	if(coord.x >= 0 && coord.y >= 0 && coord.x < max && coord.y < max) {
		var tileX = Math.floor((coord.x/tilesCount))*tilesCount;
		var tileY = Math.floor((coord.y/tilesCount))*tilesCount;
		var index = (tileY/tilesCount*this.size) + (tileX/tilesCount);
		if(this.images[index]) {
			var x = coord.x-tileX;
			var y = coord.y-tileY;
			$tile.css({
				'backgroundImage' : 'url(/tile/'+this.opts.tileSize+'/'+zoom+'/'+x+'/'+y+'/'+this.images[index]+')',
				'backgroundRepeat' : 'no-repeat'
			}).addClass('tile-click');
		}
	} else {
		$tile.addClass('tile-empty');
	}
	
	return $tile.get(0);
	
};
Lumineuse.MapType.prototype.releaseTile = function(tile) {
	$(tile).remove();
};


