(function(){
	var MapObject = Class.extend({
		obj: {},
		type: 'MapObject',
		redraw: function(){},
		hide: function(){},
		editing: false,
		group: false,
		saveEdit: function(){},
		style: {color: 'green'},
		editStyle: {color: 'red'},
		fields: {},
		get: function(field){
			if(this.fields[field] && this.fields[field]['value']){
				return this.fields[field]['value'];
			}
		},
		set: function(field, value){
			var self = this;
			if(_.isObject(field) && !value){
				_.each(field, function(value, key){ self.set(key, value);});
			} else {
				if(this.fields[field]){
					this.fields[field]['value'] = value;
				}
			}		
		},
		name: 'object',
		getGeoCoords: function(){
			var crds = []
			_.each(this.coords, function(coord){
				crds.push(coord.lng)
				crds.push(coord.lat)
			})
			return crds.join(",")
		},
		buildForm: function(){
			var title = 'Edit ' + this.name
			if(this.editTitle) title = this.editTitle
			var str = ['<div class="main-form"><h2>' + title + '</h2>'];
			for(var i in this.fields){
				var f = this.fields[i];
				switch(this.fields[i].type){
					case 'select':
						str.push('<div class="form-field"><div>' + f.name + ': </div><div><select name="' + i + '">');
						for(var j in f.values){
							str.push('<option value="' + j + '" ')
							if(j == f.value){
								str.push(' selected="selected"')
							}
							str.push('>' + f.values[j] + '</option>')
						}
						str.push('</select></div></div>');
					break;
					case 'text':
						str.push('<div class="form-field"><div>' + f.name + ': </div><div><input type="text" name="' + i + '" value="' + (this.data[i] || '' ) + '" /></div></div>');						
					break;
					case 'password':
						str.push('<div class="form-field"><div>' + f.name + ': </div><div><input type="password" name="' + i + '" value="' + (this.data[i] || '' ) + '" /></div></div>');						
					break;
					case 'checkbox':
						str.push('<div class="form-field"><div><input type="checkbox" name="' + i + '" value="' + (this.data[i] || '' ) + '" /> - ' + f.name + '</div></div>');						
					break;
				}
			}
			str.push('<br><button name="save">Save</button>&nbsp;&nbsp;<button name="discard">Discard</button></div>')
			return str.join("")
		},
		buildInfo: function(){
			var title = this.name
			var str = ['<div class="object-info"><h2>' + title + '</h2>'];
			for(var i in this.fields){
				var f = this.fields[i];
				switch(f.type){
					default:
						str.push('<div class="info-name">' + f + '</div><div class="info-val">' + this.get(i) + '</div>');			
					break;
				}
			}
			str.push('</div>');	
			return str.join("")
		},
		markers: [],
		init: function(fields, coords){
			var self = this
			this.markers = []
			this.coords = []
			this.data = {}
			_.each(fields, function(key, value){
				if(self.fields[key]){
					self.data[key] = value
				}
			})
			_.each(coords, function(cr){
				self.coords.push(new L.LatLng(cr[1], cr[0]))
			})
		},
		removePoint: function(latlng){
			for(var i in this.coords){
				if(this.coords[i].lat == latlng.lat && this.coords[i].lng == latlng.lng){
					//alert('we remove '+ i)
					this.coords.splice(i, 1)
				}
			}
		},
		changePoint: function(latlng, newlatlng){
			for(var i in this.coords){
				if(this.coords[i].lat == latlng.lat && this.coords[i].lng == latlng.lng){
					//alert('we change '+  i)
					this.coords[i] = newlatlng
					//console.dir(this.coords)
				}
			}
		},
		addMarker: function(latlng){
			var self = this;
	  		var marker = new L.Marker(latlng, {clickable: true, draggable: true})
	  		marker.addTo(map).on('click', function(){
	  			self.removePoint(marker.getLatLng())
	  			map.removeLayer(marker)
	  			self.redraw()
	  		}).on('dragend', function(){
	  			self.changePoint(marker._old_coords, marker.getLatLng())
	  			self.redraw()
	  		}).on('dragstart', function(){
	  			marker._old_coords = marker.getLatLng()
	  		});
	  		this.coords.push(latlng)
	  		this.markers.push(marker)
		},
		startEdit: function($el){
			alert('start edit');
			var self = this;
			this.original_coords = _.clone(this.coords);
		/////////////////////////////// CREATING FORM		
		  	var form = this.buildForm()
		  	$el.html(form)
		  	this.editing = $el
		  	$el.find("button[name=save]").click(function(){
		  		var data = {}
		  		$el.find(":input:not(button)").each(function() {
				    // The selector will match buttons; if you want to filter
				    // them out, check `this.tagName` and `this.type`; see
				    // below
				    data[this.name] = $(this).val();
				});
				data.coord = self.getGeoCoords();
				var req_type
				if(self.id) req_type = 'PUT'
				else req_type = 'POST'

				$.ajax('/' + self.backendName, {
					type: req_type,
					data: data,
					dataType: 'json',
					success: function(data){	
				  		self.stopEdit()
				  		app.removeEditable()
				  		ids[data._id] = self
					},
					error: function(data){
						console.dir(data)
					}
				})

		  		return false;
		  	})
		  	$el.find("button[name=discard]").click(function(){
				self.coords = self.original_coords;
		  		self.stopEdit()
		  		app.removeEditable()
		  		return false;
		  	})
		/////////////////////////////
		  	map.off('click')
		  	map.on('click', function(e){
		  		self.addMarker(e.latlng)
		  		self.redraw();
		  	})
		  	this.redraw()
		},
		stopEdit: function(){
		  	map.off('click')
		  	this.editing = false
		  	for(var i in this.markers){
		  		map.removeLayer(this.markers[i])
		  	}
		  	this.redraw()
		},
		coords: [],
	})

	var User = MapObject.extend({
		type: 'user',
		name: 'user',
		backendName: 'user',
		redraw: function(){},
		editTitle: 'Register',
		fields: {
			'login': { // e.g. Donetska railway
				name: 'Login',
				type: 'text',
			},
			'email': {
				name: 'Email',
				type: 'text',
			},
			'pw': {
				name: 'Password',
				type: 'password',
			},
			'confirm': {
				name: 'I read and accept the <a href="/rules.html">rules</a>',
				type: 'checkbox',
			},
		}
	})


	var Line = MapObject.extend({
		type: 'line',
		name: 'line',
		group: 'rrm',
		backendName: 'rail',
		redraw: function(){
			var self = this;
			if(this.obj){
				map.removeLayer(this.obj)
			}
			var style = this.editing ? this.editStyle : this.style;
			console.dir(this.coords)
			this.obj = L.polyline(this.coords, style).addTo(map).on('click', function(e){
				self.addMarker(e.latlng)
			});
		},
		fields: {
			'owner': { // e.g. Donetska railway
				name: 'Belongs to',
				type: 'select',
				values: app.data('owners'),
			},
			'gauge_width': {
				name: 'Gauge width',
				type: 'select',
				values: app.data('gauge'),
			},
			'year_start': {
				name: 'Build',
				type: 'text',
				caption: 'YYYY-MM-DD',
			},
			'year_end': {
				name: 'Closed',
				type: 'text',
				caption: 'YYYY-MM-DD',
			},
		}
	})

	var Buddy = MapObject.extend({
		type: 'object',
		name: 'object',
		group: 'rrm',
		backendName: 'object',
		/*getGeoCoords: function(){
			var crds = []
			var cordz = _.clone(this.coords);
			cordz.push(cordz[0])
			_.each(cordz, function(coord){
				crds.push(coord.lng)
				crds.push(coord.lat)
			})
			return crds.join(",")
		},*/
		redraw: function(){
			var self = this;
			if(this.obj){
				map.removeLayer(this.obj)
			}
			var style
			if(this.editing) style = this.editStyle
			else style = this.style
			this.obj = L.polygon(this.coords, style).addTo(map).on('click', function(e){
				self.addMarker(e.latlng)
			});
		},
		fields: {
			'title': { // e.g. Donetska railway
				name: 'Name',
				type: 'text',
			},
			'owner': { // e.g. Donetska railway
				name: 'Belongs to',
				type: 'select',
				values: app.data('owners'),
			},
			'type': {
				name: 'Object type',
				type: 'select',
				values: app.data('buddy'),
			},
		}
	})

	var Station = Buddy.extend({
		type: 'station',
		name: 'station',
		group: 'rrm',
		backendName: 'station',
		fields: {
			'title': { // e.g. Donetska railway
				name: 'Name',
				type: 'text',
			},
			'owner': { // e.g. Donetska railway
				name: 'Belongs to',
				type: 'select',
				values: app.data('owners'),
			},
			'gauge_width': {
				name: 'Gauge width',
				type: 'text',
				values: app.data('gauges'),
			},
			'year_start': {
				name: 'Build',
				type: 'text',
				caption: 'YYYY-MM-DD',
			},
			'year_end': {
				name: 'Closed',
				type: 'text',
				caption: 'YYYY-MM-DD',
			},
		}
	})
	
	Station.group = 'rrm';
	Buddy.group = 'rrm';
	Line.group = 'rrm';
	
	window.objectPool  = {
		'Station': Station,
		'Buddy': Buddy,
		'Line': Line,
		'User': User,	
	}
	
}());
