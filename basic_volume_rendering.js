'use strict';

let volumes = {
	/*engine:'res/nrrd/engine.nrrd',
	skull:'res/nrrd/skull.nrrd',*/
	case1_tp1:'res/nrrd/case1_tp1.nrrd',
	case1_tp2:'res/nrrd/case1_tp2.nrrd',
	case2_tp1:'res/nrrd/case2_tp1.nrrd',
	case2_tp2:'res/nrrd/case2_tp2.nrrd',
	case3_tp1:'res/nrrd/case3_tp1.nrrd',
	case3_tp2:'res/nrrd/case3_tp2.nrrd',
	case4_tp1:'res/nrrd/case4_tp1.nrrd',
	case4_tp2:'res/nrrd/case4_tp2.nrrd',
	case5_tp1:'res/nrrd/case5_tp1.nrrd',
	case5_tp2:'res/nrrd/case5_tp2.nrrd',
	case6_tp1:'res/nrrd/case6_tp1.nrrd',
	case6_tp2:'res/nrrd/case6_tp2.nrrd',
	aneurysm:'res/nrrd/aneurysm.nrrd',
	dtibrain:'res/nrrd/DTI-Brain.nrrd',
	avf:	'res/nrrd/avf.nrrd',
	I:		'res/nrrd/I.nrrd',
	bonsai:	'res/tiled/bonsai128x128x256.png',
	head:	'res/tiled/head128x128x256.png',
	heart:	'res/tiled/heart128x128x256.png',
	torso:	'res/tiled/torso128x128x256.png'
};

let volumePath = volumes.case1_tp1;

let volumeDimensions = {
	x: 256,
	y: 256,
	z: 256
};

let dataRange = {
	min: 0,
	max: 1
}

let samplingRate = 250;
let alphaCorrection = 0.1;

let datasetDimensions = {
	x: 0,
	y: 0,
	z: 0
};

let slices = {
	x: 16,
	y: 16
};

let tiles = slices;

let updateTF = true;

let tf_panel;

let tf_img;

// make canvases fullscreen
function resizeCanvas() {

	let canvas_width = window.innerWidth;
	let canvas_height = window.innerHeight;

	canvas.width = canvas_width;
	canvas.height = canvas_height;

	canvas.style.width = canvas_width + 'px';
	canvas.style.height = canvas_height + 'px';
	//canvas.style.position = canvas.style.position || 'absolute';

	let gl = canvas.context;
	if( canvas.backfaceFrameBuffer !== undefined ) {
		gl.deleteFramebuffer( canvas.backfaceFrameBuffer.buffer );
		gl.deleteTexture( canvas.backfaceFrameBuffer.texture );
	}

	canvas.backfaceFrameBuffer = createFBO.call( canvas, [ canvas_width, canvas_height ] );

	if( camera ) {
		camera.setAspectRatio( canvas.width, canvas.height );
		camera.update();
	}

	requestRendering();
}

//adjust canvas dimensions and re-render on resize
window.addEventListener( 'resize', resizeCanvas, false );

////////////////////////////////////////////////////////////////////////////////
// CAMERA SETUP
////////////////////////////////////////////////////////////////////////////////

let camera;

function initCamera() {
	camera = createCamera(  [ 0, 4, 0 ], /* eye vector */
		[ 0, 0, 0 ], /* target */
		[ 0, 0, 1 ] ); /* up vector */
	//camera.setAspectRatio( canvases[ 0 ].width, canvases[ 0 ].height );
	//camera.update();
}

/////////////////////////////////

//todo consider non-power of two support
function createTextureFromImage( image, flip_y = true ) {
	let gl = this.context;

	let texture = gl.createTexture();

	gl.activeTexture( gl.TEXTURE0 );
	gl.bindTexture( gl.TEXTURE_2D, texture );
	//TODO: make flip_y optional
	gl.pixelStorei( gl.UNPACK_FLIP_Y_WEBGL, flip_y );
	gl.texImage2D( gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image );
	gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR );
	gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR );
	gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE );
	gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE );
	gl.bindTexture( gl.TEXTURE_2D, null );

	if( gl.getError() !== gl.NO_ERROR ) console.log( gl.getError() );
	return texture;
}

function createTextureFromSize( dimensions, data = null ) {
	let gl = this.context;

	let texture = gl.createTexture();

	gl.activeTexture( gl.TEXTURE0 );
	gl.bindTexture( gl.TEXTURE_2D, texture );

	//TODO: make flip_y optional
	gl.pixelStorei( gl.UNPACK_FLIP_Y_WEBGL, true );

	if( data && data.length < dimensions[ 0 ] * dimensions[ 1 ] * 4 ){
		console.log( 'data length is ' + data.length + ', after padding length is ' + dimensions[ 0 ] * dimensions[ 1 ] * 4 );
		let paddedData = new data.constructor( dimensions[ 0 ] * dimensions[ 1 ] * 4 );
		paddedData.fill( 0 );
		paddedData.set( data );
		data = paddedData;
	}
	gl.texImage2D( gl.TEXTURE_2D, 0, gl.RGBA, dimensions[ 0 ], dimensions[ 1 ], 0, gl.RGBA, gl.FLOAT, data ); //creates 32bit float texture
	gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR );
	gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR );
	gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE );
	gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE );
	gl.bindTexture( gl.TEXTURE_2D, null );

	if( gl.getError() !== gl.NO_ERROR ) console.log( gl.getError() );
	return texture;
}

function expandArray( data ) { // incoming data only has 1 value per voxel
	var i, l = data.length;
	var outputData = new Float32Array( l * 4 );
	/*let min = Number.MAX_VALUE, max = Number.MIN_VALUE;*/
	for ( i = 0; i < l; i++ ) {
		var value = data[ i ];
		outputData[ 4 * i ] = value;
		outputData[ 4 * i + 1 ] = value;
		outputData[ 4 * i + 2 ] = value;
		outputData[ 4 * i + 3 ] = value;

		//for debugging
		/*if ( value < min ) {
		 min = value;
		 }
		 if ( value > max ) {
		 max = value;
		 }*/

	}
	return outputData;
}

function create3DTexture( dimensions, data = null ) {
	let gl = this.context;
	let texture = gl.createTexture();

	gl.activeTexture( gl.TEXTURE0 );
	gl.bindTexture( gl.TEXTURE_3D, texture );

	/*if( data && data.length == ( volumeDimensions.x * volumeDimensions.y * volumeDimensions.z ) ) {
		data = expandArray( data );
	}*/

	let type = gl.FLOAT;
	if( data ) {
		//let datatype = typeof( data );
		if ( data instanceof Uint8Array || data instanceof Uint8Array ) {
			type = gl.UNSIGNED_BYTE;
		} else if ( data instanceof Float32Array ) {
			type = gl.FLOAT;
		}
	}

	gl.texImage3D(
		gl.TEXTURE_3D,   // target
		0,               // level
		gl.RGBA,         // internalformat
		dimensions[ 0 ], // width
		dimensions[ 1 ], // height
		dimensions[ 2 ], // depth
		0,               // border
		gl.RGBA,         // format
		type,	         // type //gl.UNSIGNED_BYTE
		data             // pixel
	);

	gl.texParameteri( gl.TEXTURE_3D, gl.TEXTURE_MIN_FILTER, gl.LINEAR );
	gl.texParameteri( gl.TEXTURE_3D, gl.TEXTURE_MAG_FILTER, gl.LINEAR );
	gl.texParameteri( gl.TEXTURE_3D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE );
	gl.texParameteri( gl.TEXTURE_3D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE );
	gl.bindTexture( gl.TEXTURE_3D, null );

	return texture;
}

/* Loading fragment and vertex shaders using xhr */
let setupShaders = function ( name, vertexShaderPath, fragmentShaderPath, uniforms ) {
	let gl = this.context;

	let deferred = $.Deferred();
	var shaders = loadXHR( [ vertexShaderPath, fragmentShaderPath ], 'text',
		/* Callback function initializing shaders when all resources have been loaded */
		function() {
			let program = gl.createProgram();
			program.source = [];
			var success = true;

			shaders.forEach(function( shaderObject ) {
				let shaderType = 'unknown';
				if( shaderObject.path.includes( 'frag' ) ) {
					shaderType = 'fragment';
				}
				if( shaderObject.path.includes( 'vert' ) ) {
					shaderType = 'vertex';
				}
				//todo: check for unknown shader type

				let shaderSource = shaderObject.data;

				let shader = gl.createShader(
					shaderType == 'fragment' ? gl.FRAGMENT_SHADER : gl.VERTEX_SHADER
				);

				if( gl.type === 'webgl' ) {
					shaderSource = convertShader( shaderSource, shaderType );
				}

				gl.shaderSource( shader, shaderSource );
				program.source[ shaderType ] = shaderSource;

				gl.compileShader( shader );
				if ( !gl.getShaderParameter( shader, gl.COMPILE_STATUS ) ) {
					//alert( 'could not compile ' + shaderObject.type + ' shader \'' + shaderObject.path + '\'' );
					console.error( shaderObject.path + ': ' + gl.getShaderInfoLog( shader ) );
					console.log( shaderSource );
					success = false;
					return false;
				} else {
					console.log( 'compiled ' + shaderType + ' shader \'' + shaderObject.path + '\'' );
				}

				gl.attachShader( program, shader );
				gl.deleteShader( shader );
			});

			if( !success ) {
				deferred.reject();
			}

			gl.linkProgram( program );

			//name program by fragment shader name minus extension minus folder
			program.name = name;//fragmentShaderPath.slice( 0, -5 ).slice( fragmentShaderPath.indexOf( '/' ) + 1 );

			if ( !gl.getProgramParameter( program, gl.LINK_STATUS ) ||  gl.isContextLost() ) {
				console.error( gl.getProgramInfoLog( program ) );
				//alert( 'could not initialise shaders for ' + program.name + ' program' );
			}

			//Todo init attrib & uniforms?
			deferred.resolve( [ program, uniforms ] );
		} );

	return deferred.promise();
};

function convertShader( shaderSource, shaderType ) {
	/* Remove occurrences of “#version” until next newline */
	let index = shaderSource.search( /#version/ );
	if( index >= 0 ) {
		let nextLinebreak = shaderSource.substr( index ).search( /\r|\n/ );
		shaderSource = shaderSource.slice( 0, index ).concat( shaderSource.slice( index + nextLinebreak + 1 ) );
	}
	switch( shaderType ) {
		case 'vertex':
			/* Vertex shaders: exchange “in” for “attribute”, exchange “out” for “varying” */
			shaderSource = shaderSource.replace( /\b(in)\b/g, 'attribute' );
			shaderSource = shaderSource.replace( /\b(out)\b/g, 'varying' );
			break;
		case 'fragment':
			/* Fragment shaders: exchange “in” for “varying” */
			shaderSource = shaderSource.replace( /\b(in)\b/g, 'varying' );

			/* parse name of out vec4 and replace name with gl_FragColor */
			index = shaderSource.search( /\b(out vec4)\b/g );
			let nextSemicolon = shaderSource.substr( index + 9 ).search( /(;)/ );
			let outName = shaderSource.slice( index + 9, index + 9 + nextSemicolon );
			//remove line containing out vec4 from shader
			shaderSource = shaderSource.slice( 0, index ).concat( shaderSource.slice( index + 9 + nextSemicolon + 1 ) );

			let regexOutName = new RegExp( '\\b(' + outName + ')\\b', 'g' );
			shaderSource = shaderSource.replace( regexOutName, 'gl_FragColor' );
			break;
	}

	/* Look for occurrences of “sampler” and make list of “sampler2D” variable names and “sampler3D” variable names */
	let sampler2Ds = [],
		sampler3Ds = [];
	let regex = /sampler[23]D/g, regexLength = 9, result;

	while ( ( result = regex.exec( shaderSource ) ) != null ) {
		let nextSemicolonOrComma = shaderSource.substr( result.index + regexLength ).search( /[;,]/ );
		if( nextSemicolonOrComma > 0 ) {
			let inbetween = shaderSource.substr( result.index + regexLength, nextSemicolonOrComma ).trim();

			if( /2/.test(result[ 0 ] ) ) {
				sampler2Ds.push( inbetween );
			}

			if( /3/.test(result[ 0 ] ) ) {
				sampler3Ds.push( inbetween );
			}
		} else {
			//todo otherwise delete entire line (precision specifier)
		}
	}

	/* Substitute “sampler3D” with “sampler2D” */
	shaderSource = shaderSource.replace( regex, 'sampler2D' );

	if( sampler3Ds.length > 0 ) {
		//find first function in shader
		let firstCurlyBrace = shaderSource.search( /{/ );
		let firstSemicolonBeforeThat = shaderSource.lastIndexOf( ';', firstCurlyBrace );

		let polyfill3DtexturesTrilinear = `
uniform vec2 tiles;

vec4 sampleAs3DTexture( sampler2D volume, vec3 texCoord ) {
    texCoord = clamp( texCoord, 0., 1. );

    float volumeDepth = tiles.x * tiles.y;
    float max_slice = volumeDepth - 1.;
    vec2 slice1, slice2;
    
    //z coordinate determines which 2D tile we sample from
    //z slice number runs from 0 to 255.
    //sample two slices to do trilinear sampling
    float slice1_z = floor( texCoord.z * max_slice );
    float slice2_z = clamp( slice1_z + 1., 0., max_slice );
    
    float dx1 = mod( slice1_z, tiles.x );
    float dy1 = floor( slice1_z / tiles.x );
    
    float dx2 = mod( slice2_z, tiles.x );
    float dy2 = floor( slice2_z / tiles.x );
    
    slice1.x = ( texCoord.x + dx1 ) / tiles.x;
    slice1.y = ( texCoord.y + dy1 ) / tiles.y;
    
    slice2.x = ( texCoord.x + dx2 ) / tiles.x;
    slice2.y = ( texCoord.y + dy2 ) / tiles.y;
    
    //bilinear filtering is done at each texture2D lookup by default
    vec4 color1 = texture2D( volume, slice1 );
    vec4 color2 = texture2D( volume, slice2 );
    
    float zDifference = mod( texCoord.z * max_slice, 1.0 );
    //interpolate between the two intermediate colors of each slice
    return mix( color1, color2, zDifference );
}`;

		let polyfill3Dtextures = `
uniform vec2 tiles;

vec4 sampleAs3DTexture( sampler2D volume, vec3 texCoord ) {
    texCoord = clamp( texCoord, 0., 1. );
    
    float volumeDepth = tiles.x * tiles.y;
    float max_slice = volumeDepth - 1.;
    
    vec2 slice;

    float slice_z = floor( texCoord.z * max_slice );
    
    float dx = mod( slice_z, tiles.x );
    float dy = floor( slice_z / tiles.x );

    slice.x = ( texCoord.x + dx ) / tiles.x;
    slice.y = ( texCoord.y + dy ) / tiles.y;

    return texture2D( volume, slice );
}`;
		//insert polyfill function as first function in shader
		if( shaderSource.includes( 'trilinear' ) ) {
			//find out whether shader contains the word "trilinear' (in a comment)
			shaderSource = shaderSource.slice( 0, firstSemicolonBeforeThat + 1 ).concat( polyfill3DtexturesTrilinear ).concat( shaderSource.slice( firstSemicolonBeforeThat + 2 ) );
		} else {
			shaderSource = shaderSource.slice( 0, firstSemicolonBeforeThat + 1 ).concat( polyfill3Dtextures ).concat( shaderSource.slice( firstSemicolonBeforeThat + 2 ) );
		}
		//DEBUG
		//console.log( shaderSource );
	}

	regex = /\btexture\(/g;
	while ( result = regex.exec( shaderSource ) ) {
		//comma has to follow since texture requires two arguments
		let nextComma = shaderSource.substr( result.index + regexLength ).search( /,/ );
		if( nextComma == 0 ) continue;

		let inbetween = shaderSource.substr( result.index + regexLength, nextComma ).trim();

		let find2D = sampler2Ds.indexOf( inbetween );
		let find3D = sampler3Ds.indexOf( inbetween );

		if( find2D > -1 ) {
			shaderSource = shaderSource.slice( 0, result.index ).concat( 'texture2D' ).concat( shaderSource.slice( result.index + 7 ) );
		} else if( find3D > -1 ) {
			shaderSource = shaderSource.slice( 0, result.index ).concat( 'sampleAs3DTexture' ).concat( shaderSource.slice( result.index + 7 ) );
		}
	}

	/* trim excess whitespace and superfluous newlines from both sides of the code */
	shaderSource = shaderSource.replace(/^\s+|\s+$/g, '');

	/* remove >2 linebreaks and replace with single empty line (for OCD people) */
	shaderSource = shaderSource.replace(/\n\s*\n\s*\n/g, '\n\n');

	//if( shaderType === 'fragment' ) console.log( shaderSource );
	return shaderSource;
}


/*
 request using asynchronous (or synchronous, but deprecated) XMLHttpRequest
 based on (c) WebReflection http://webreflection.blogspot.com/2010/09/fragment-and-vertex-shaders-my-way-to.html (released under MIT License)
 */
function loadXHR( items, responsetype, callback ) {
	function onload() {
		var xhr = this,
			i = xhr.i;
		result[ i ] = {
			data: ( xhr.responseType == 'text' ) ? xhr.responseText : xhr.response,
			path: items[ i ]
		};
		!--length && typeof callback == 'function' && callback( result );
	}

	var result = [];
	for ( var i = items.length, length = i, xhr; i--; ) {
		xhr = new XMLHttpRequest();
		xhr.i = i;
		xhr.open( 'get', items[ i ], true );
		xhr.responseType = responsetype || 'text';

		xhr.onload = onload;

		xhr.send( null );
		//onload.call( xhr );
	}
	return result;
}

//TODO: make floating point optional
//also TODO: make polyfill for non-extension-supporting browsers (eventually)
function createFBO( dimensions, data = null ) {
	let gl = this.context;
	// create a texture for the frame buffer

	let fbo = gl.createFramebuffer();
	gl.bindFramebuffer( gl.FRAMEBUFFER, fbo );
	gl.clearColor( 0., 0., 0., 1.0 );
	//gl.clearColor( 0.5, 0.5, 0.5, 1.0 );

	let fboTexture;

	if( data && data.length == ( volumeDimensions.x * volumeDimensions.y * volumeDimensions.z ) ) {
		data = expandArray( data );
	}

	//create 2D or 3D framebuffer
	switch ( dimensions.length ) {
		case 3:
			if( gl.type === 'webgl2' ) {
				fboTexture = create3DTexture.call( this, dimensions, data );
				for( let layer = 0; layer < volumeDimensions.z; layer++ ) {
					gl.framebufferTextureLayer( gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, fboTexture, 0, layer );
				}
				break;
			} else {
				tiles = { x: slices.x, y: Math.ceil( dimensions[ 2 ] / slices.x ) };
				console.log(' creating tiled texture with ' + tiles.x + ' by ' + tiles.y + ' tiles for WebGL compatibility. ');

				dimensions[ 0 ] *= tiles.x;
				dimensions[ 1 ] *= tiles.y;
				dimensions.splice( 2, 1 );

				// fallthrough: continue to 2d case
				/*fboTexture = createTextureFromSize.call( this, dimensions );
				 gl.framebufferTexture2D( gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, fboTexture, 0 );*/
			}
		case 2:
			fboTexture = createTextureFromSize.call( this, dimensions, data );

			gl.framebufferTexture2D( gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, fboTexture, 0 );
			break;
		default:
			console.log( dimensions.length + ' is not a valid number of dimensions for FBO creation.');
	}

	gl.clear( gl.COLOR_BUFFER_BIT );
	gl.bindFramebuffer( gl.FRAMEBUFFER, null );

	if ( gl.checkFramebufferStatus( gl.FRAMEBUFFER ) != gl.FRAMEBUFFER_COMPLETE ) {
		console.log( 'framebuffer incomplete: ' + gl.checkFramebufferStatus( gl.FRAMEBUFFER ).toString( 16 ) );
	}

	console.log( '... created FBO with dimensions ' + dimensions[ 0 ] + 'x' + dimensions[ 1 ] + ( dimensions[ 2 ] ? ( 'x' + dimensions[ 2 ] ) : '' ) );
	return { buffer:    fbo,
		hasData:	data != null,
		texture:   fboTexture,
		type:      dimensions.length == 2 ? gl.TEXTURE_2D : gl.TEXTURE_3D,
		width:     dimensions[ 0 ],
		height:    dimensions[ 1 ],
		depth:     dimensions.length > 2 ? dimensions[ 2 ] : undefined };
}

function create2DBuffers() {
	let gl = this.context;

	this.position2DBuffer = gl.createBuffer();
	let positionVertices =  // GL_TRIANGLE_STRIP
		[   -1., -1., 0.,     // bottom left corner
			1., -1., 0.,     // bottom right corner
			-1.,  1., 0.,     // top left corner
			1.,  1., 0. ];   // top right corner
	let positionVerticesTriangle = //GL_TRIANGLES
		[   -1., -1.,
			1., -1.,
			-1.,  1.,
			-1.,  1.,
			1., -1.,
			1.,  1. ];
	gl.bindBuffer( gl.ARRAY_BUFFER, this.position2DBuffer );
	gl.bufferData( gl.ARRAY_BUFFER, new Float32Array( positionVerticesTriangle ), gl.STATIC_DRAW );
	gl.bindBuffer( gl.ARRAY_BUFFER, null );

	this.texCoord2DBuffer = gl.createBuffer();
	let textureCoords =  // GL_TRIANGLE_STRIP
		[   0., 0.,
			1., 0.,
			0., 1.,
			1., 1. ];
	let textureCoordsTriangle = //GL_TRIANGLES
		[   0., 0.,
			1., 0.,
			0., 1.,
			0., 1.,
			1., 0.,
			1., 1. ];
	gl.bindBuffer( gl.ARRAY_BUFFER, this.texCoord2DBuffer );
	gl.bufferData( gl.ARRAY_BUFFER, new Float32Array( textureCoordsTriangle ), gl.STATIC_DRAW );
	gl.bindBuffer( gl.ARRAY_BUFFER, null );
}

function create3DBuffers() {
	let gl = this.context;

	this.position3DBuffer = gl.createBuffer();

	let v0 = [ -1, -1, -1 ], t0 = [ 0, 0, 0 ],
		v1 = [ -1, -1,  1 ], t1 = [ 0, 0, 1 ],
		v2 = [ -1,  1,  1 ], t2 = [ 0, 1, 1 ],
		v3 = [  1,  1, -1 ], t3 = [ 1, 1, 0 ],
		v4 = [ -1,  1, -1 ], t4 = [ 0, 1, 0 ],
		v5 = [  1, -1,  1 ], t5 = [ 1, 0, 1 ],
		v6 = [  1, -1, -1 ], t6 = [ 1, 0, 0 ],
		v7 = [  1,  1,  1 ], t7 = [ 1, 1, 1 ];

	let positionVertices = [];
	positionVertices = positionVertices.concat( v0, v1, v2 ); //left
	positionVertices = positionVertices.concat( v3, v0, v4 ); //back
	positionVertices = positionVertices.concat( v5, v0, v6 ); //bottom
	positionVertices = positionVertices.concat( v3, v6, v0 ); //back
	positionVertices = positionVertices.concat( v0, v2, v4 ); //left
	positionVertices = positionVertices.concat( v5, v1, v0 ); //bottom
	positionVertices = positionVertices.concat( v2, v1, v5 ); //front
	positionVertices = positionVertices.concat( v7, v6, v3 ); //right
	positionVertices = positionVertices.concat( v6, v7, v5 ); //right
	positionVertices = positionVertices.concat( v7, v3, v4 ); //top
	positionVertices = positionVertices.concat( v7, v4, v2 ); //top
	positionVertices = positionVertices.concat( v7, v2, v5 ); //front

	gl.bindBuffer( gl.ARRAY_BUFFER, this.position3DBuffer );
	gl.bufferData( gl.ARRAY_BUFFER, new Float32Array( positionVertices ), gl.STATIC_DRAW );

	this.texCoord3DBuffer = gl.createBuffer();
	let textureCoords = [];
	textureCoords = textureCoords.concat( t0, t1, t2 ); //left
	textureCoords = textureCoords.concat( t3, t0, t4 ); //back
	textureCoords = textureCoords.concat( t5, t0, t6 ); //bottom
	textureCoords = textureCoords.concat( t3, t6, t0 ); //back
	textureCoords = textureCoords.concat( t0, t2, t4 ); //left
	textureCoords = textureCoords.concat( t5, t1, t0 ); //bottom
	textureCoords = textureCoords.concat( t2, t1, t5 ); //front
	textureCoords = textureCoords.concat( t7, t6, t3 ); //right
	textureCoords = textureCoords.concat( t6, t7, t5 ); //right
	textureCoords = textureCoords.concat( t7, t3, t4 ); //top
	textureCoords = textureCoords.concat( t7, t4, t2 ); //top
	textureCoords = textureCoords.concat( t7, t2, t5 ); //front

	gl.bindBuffer( gl.ARRAY_BUFFER, this.texCoord3DBuffer );
	gl.bufferData( gl.ARRAY_BUFFER, new Float32Array( textureCoords ), gl.STATIC_DRAW );
}

initCamera();
let canvas = document.querySelector( '.renderCanvas' );

canvas.active = true;
canvas.isRendering = false;

// OpenGL context
let glType = $( canvas ).data( 'gltype' );

let gl = canvas.getContext( glType, { antialias: false, preserveDrawingBuffer: true } );
//let gl = WebGLDebugUtils.makeDebugContext( canvas.getContext( glType, { antialias: false, preserveDrawingBuffer: true } ) );

let isGL = !!gl;
if( !isGL ) {
	if( glType === 'webgl2' ) {
		$( '#log' ).html( 'WebGL 2.0 is not available in your browser.  See <a href="https://www.khronos.org/webgl/wiki/Getting_a_WebGL_Implementation">How to run WebGL 2.0</a>' );
	} else {
		$( '#log' ).html( 'WebGL is not available in your browser.  See <a href="https://www.khronos.org/webgl/wiki/Getting_a_WebGL_Implementation">How to run WebGL</a>' );
	}
}

if( gl ) {
	canvas.context = gl;
	gl.type = glType;

	if( glType === 'webgl' ) {
		// load extensions for float textures
		let float_ext = gl.getExtension( 'OES_texture_float' );
		if ( !float_ext ) {
			console.error( 'no floating point texture support on your system' );
		}

	} else {
		let color_ext = gl.getExtension( 'EXT_color_buffer_float' );
		if ( !color_ext ) {
			console.error( 'no WEBGL floating point color buffer support on your system' );
		}
	}
	let linear_ext = gl.getExtension( 'OES_texture_float_linear' );
	if ( !linear_ext ) {
		console.error( 'no floating point linear filtering support on your system' );
	}

	init( canvas );
}


function freeResources( canvas ) {
	let gl = canvas.context;
	if( gl == undefined ) {
		console.error( 'freeResources: gl undefined' );
		return;
	}

	if( canvas.tiledVolume !== undefined ) {
		gl.deleteTexture( canvas.tiledVolume );
	}

	if( canvas.volumeFrameBuffer !== undefined ) {
		gl.deleteFramebuffer( canvas.volumeFrameBuffer.buffer );
		gl.deleteTexture( canvas.volumeFrameBuffer.texture );
	}
}

function init( canvas ) {
	let gl = canvas.context;

	if( !tf_panel ) {
		tf_panel = new TF_panel( canvas );
		tf_panel.registerCallback( function () {
			updateTF = true;
			requestRendering();
		} );
	}

	freeResources( canvas );
	resizeCanvas();

	gl.viewport( 0, 0, canvas.width, canvas.height );
	gl.clearColor( 0., 0., 0., 1. );
	gl.clear( gl.COLOR_BUFFER_BIT );

	let volume_async_load = $.Deferred();
	UI.loading();

	create2DBuffers.call( canvas );
	create3DBuffers.call( canvas );

	if( volumePath.includes( 'tiled' ) ) {
		dataRange.min = 0;
		dataRange.max = 1;

		//extract numbers from volume path to parse the volume dimensions from the file name
		let parsedNumbers = volumePath.match( /^\d+|\d+\b|\d+(?=\w)/g ).map( function ( v ) { return +v; } );
		if( !parsedNumbers.length < 3 ) {
			datasetDimensions.x = parsedNumbers[ parsedNumbers.length - 3 ];
			datasetDimensions.y = parsedNumbers[ parsedNumbers.length - 2 ];
			datasetDimensions.z = parsedNumbers[ parsedNumbers.length - 1 ];

			volumeDimensions.x = datasetDimensions.x;
			volumeDimensions.y = datasetDimensions.y;
			volumeDimensions.z = datasetDimensions.z;
		}

		let sourceImage = new Image();
		sourceImage.onload = function () {
			//load tiled volume from PNG to texture
			canvas.tiledVolume = createTextureFromImage.call( canvas, sourceImage );
			//create 3D FBO for 3D volume texture
			canvas.volumeFrameBuffer = createFBO.call( canvas, [ volumeDimensions.x, volumeDimensions.y, volumeDimensions.z ] );

			canvas.sourceImage = sourceImage;

			var dataCanvas = document.createElement( 'canvas' );
			dataCanvas.width = sourceImage.width;
			dataCanvas.height = sourceImage.height;
			var tmpContext = dataCanvas.getContext( '2d' ); // Get canvas 2d context
			tmpContext.drawImage( sourceImage, 0, 0 ); // Draw the texture
			canvas.data = tmpContext.getImageData( 0, 0, sourceImage.width, sourceImage.height ).data;

			UI.finishedLoading();
			volume_async_load.resolve();
		};
		sourceImage.src = volumePath;
	} else if( volumePath.includes( 'nrrd' ) ) {
		let loadedVolume = loadXHR( [ volumePath ], 'arraybuffer', function() {
			var nrrd = loadedVolume[ 0 ].data;
			if( !nrrd ) {
				console.error( 'nrrd file data could not be read.' );
				volume_async_load.reject();
			}
			let volume = NRRDLoader.parse( nrrd );
			canvas.volume = volume;
			canvas.data = volume.data;

			datasetDimensions.x = volume.dimensions[ 0 ];
			datasetDimensions.y = volume.dimensions[ 1 ];
			datasetDimensions.z = volume.dimensions[ 2 ];

			volumeDimensions.x = datasetDimensions.x;
			volumeDimensions.y = datasetDimensions.y;
			volumeDimensions.z = datasetDimensions.z;

			canvas.volumeFrameBuffer = createFBO.call( canvas, [ volumeDimensions.x, volumeDimensions.y, volumeDimensions.z ], volume.data );

			UI.finishedLoading();
			volume_async_load.resolve();
		} );
	}

	let quad_vert = 'shaders_webgl2/quad.vert';
	let box_vert  = 'shaders_webgl2/projected_box.vert';

	let attribs = [ 'position', 'texCoord' ];

	//TODO: parse uniforms from shader? create shader and add uniforms to shader string?
	//parsing uniforms from shader code shouldn't be too hard ... actually

	//list of shaders
	//format: [ vertexShaderPath, fragmentShaderPath, Array_of_uniforms, renderFunction
	let shaderPairs = [
		[ 'initialize_volume', quad_vert, 'shaders_webgl2/initialize_volume.frag',
			[   { name: 'tiles',                type: 'vec2',       variable: 'slices' },
				{ name: 'datasetDimensions',    type: 'vec3',       variable: 'datasetDimensions' },
				{ name: 'volumeDimensions',     type: 'vec3',       variable: 'volumeDimensions' },
				{ name: 'layer',                type: 'float',      variable: 'layer' } ]
		],
		[ 'backfaces', box_vert,  'shaders_webgl2/backfaces.frag',
			[   { name: 'projectionMatrix',     type: 'matrix4v',   variable: 'camera.projectionMatrix' },
				{ name: 'modelViewMatrix',      type: 'matrix4v',   variable: 'camera.modelViewMatrix' } ]
		],
		[ 'debug', quad_vert, 'shaders_webgl2/debug_texture.frag',
			[   { name: 'tex',                  type: 'sampler3D',  variable: 'texture' },
				{ name: 'tiles',                type: 'vec2',       variable: 'tiles' } ]
		],
		[ 'raytrace', box_vert,  'shaders_webgl2/raytrace_simplified.frag',
			[	{ name: 'tiles',                type: 'vec2',       variable: 'tiles' },
				{ name: 'samplingRate',        	type: 'int',	    variable: 'samplingRate' },
				{ name: 'alphaCorrection',		type: 'float',	    variable: 'alphaCorrection' },
				{ name: 'dataRange',          	type: 'vec2',	    variable: 'dataRange' },
				{ name: 'backfaceTexture',      type: 'sampler2D',  variable: 'backfaceTexture' },
				{ name: 'transferTexture', 		type: 'sampler2D',  variable: 'transferTexture' },
				{ name: 'volumeTexture',        type: 'sampler3D',  variable: 'volumeTexture' },
				{ name: 'projectionMatrix',     type: 'matrix4v',   variable: 'camera.projectionMatrix' },
				{ name: 'modelViewMatrix',      type: 'matrix4v',   variable: 'camera.modelViewMatrix' } ]
		]
	];

	let deferreds = $.map( shaderPairs, function( current ) {
		return setupShaders.call( canvas, current[ 0 ], current[ 1 ], current[ 2 ], current[ 3 ] );
	});

	//add volume loading to deferred tasks
	deferreds.push( volume_async_load );

	let getLocations = function ( program, attribs, uniforms ) {
		$.map( attribs, function( attrib ) {
			program[ attrib ] = gl.getAttribLocation( program, attrib );
		});
		$.map( uniforms, function( uniform ) {
			program[ uniform.name ] = gl.getUniformLocation( program, uniform.name );
		});
	};

	//todo: make execution of deferred and their resolve objects cleaner
	//when all deferreds are resolved, then
	$.when.apply( $, deferreds ).done( function() {
		//step through all created shader programs and obtain their uniform and attrib locations
		//store created programs to programs array under the name of their fragment shader
		canvas.programs = {};

		for( let argument of arguments ) {
			//for( let i = 0; i < arguments.length; i++ ) {
			if ( argument === undefined ) {
				continue;
			}
			let program = argument[ 0 ];
			let uniforms = argument[ 1 ];
			//get uniform locatios for all uniforms in list
			getLocations( program, attribs, uniforms );
			canvas.programs[ program.name ] = program;
		}

		gl.enableVertexAttribArray( canvas.programs[ 'raytrace' ].position );
		gl.enableVertexAttribArray( canvas.programs[ 'raytrace' ].texCoord );
		//updateRaytraceUniforms( programs[ 'raytrace' ] );

		tf_panel.updateHistogram = true;
		tf_panel.draw();
		renderOnce.call( canvas );
		requestRendering();
	} );
}

function updateTransferFunctionTextures( canvas ) {
	tf_img = tf_panel.TFtoIMG();
	canvas.transferTexture = createTextureFromImage.call( canvas, tf_img, false );
	console.log( 'updated transfer function texture' );
}

function renderOnce() {
	if( $.isEmptyObject( this.programs ) ) return;

	console.log( 'initializing...' );

	//transfer the volume from the two tiled texture into the volume 3D texture
	if( !this.volumeFrameBuffer.hasData ) {
		initializeVolume.call( this, this.programs[ 'initialize_volume' ], this.volumeFrameBuffer, this.tiledVolume );
	} else if( gl.type === 'webgl' ) {
		
	}
}

function requestRendering() {
	if( canvas.isRendering ) {
		console.log( 'skipping rendering' );
		return;
	}
	canvas.isRendering = window.requestAnimationFrame( function() {
		render.call( canvas );
	} );
}

function render() {
	if( $.isEmptyObject( this.programs ) ) {
		this.isRendering = false;
		return;
	}

	if( updateTF ) {
		updateTransferFunctionTextures( this );
		updateTF = false;
	}
	//render backface
	renderBackface.call( this, this.programs[ 'backfaces' ], this.backfaceFrameBuffer );
	//raytrace volume
	renderRaytrace.call( this, this.programs[ 'raytrace' ], this.volumeFrameBuffer, this.backfaceFrameBuffer, this.transferTexture );

	//debug
	//renderTextureToViewport.call( this, this.programs[ 'debug' ], this.volumeFrameBuffer.texture );

	this.isRendering = false;
}

// RENDER FUNCTIONS

//transfer volume from tiled 2D format into 3D texture
function initializeVolume ( program, volumeFrameBuffer, tiledTexture ) {
	let gl = this.context;

	gl.useProgram( program );

	gl.uniform2f( program.tiles, slices.x, slices.y );
	gl.uniform3f( program.volumeDimensions, volumeDimensions.x, volumeDimensions.y, volumeDimensions.z );
	gl.uniform3f( program.datasetDimensions, datasetDimensions.x, datasetDimensions.y, datasetDimensions.z );

	gl.activeTexture( gl.TEXTURE0 );
	gl.bindTexture( gl.TEXTURE_2D, tiledTexture );
	gl.uniform1i( program.tiledTexture, 0 );

	renderTo3DTexture.call( this, program, volumeFrameBuffer, volumeDimensions.z );
}

//render backface of cube
function renderBackface( program, frameBuffer ) {
	let gl = this.context;

	gl.enable( gl.CULL_FACE );
	gl.enable( gl.DEPTH_TEST );

	gl.cullFace( gl.FRONT );

	gl.bindFramebuffer( gl.FRAMEBUFFER, frameBuffer.buffer ); //render to framebuffer, not screen

	gl.viewport( 0, 0, this.width, this.height );

	gl.useProgram( program );

	//todo: this shouldn't be here
	gl.uniform2f( program.tiles, tiles.x, tiles.y );
	//todo: this shouldn't be here
	gl.uniform2f( program.tiles, tiles.x, tiles.y );
	gl.uniformMatrix4fv( program.projectionMatrix, false, camera.projectionMatrix );
	gl.uniformMatrix4fv( program.modelViewMatrix, false, camera.modelViewMatrix );

	renderCube.call( this, program );

	gl.bindFramebuffer( gl.FRAMEBUFFER, null );

	gl.disable( gl.CULL_FACE );
	gl.disable( gl.DEPTH_TEST );
}

//renderRaytrace.call( this, this.programs[ 'raytrace' ], this.volumeFrameBuffer, this.backfaceFrameBuffer, this.transferTexture );

//do raytracing of cube
function renderRaytrace( program, volumeFrameBuffer, backfaceFrameBuffer, transferTexture = null ) {
	let gl = this.context;

	gl.viewport( 0, 0, this.width, this.height );

	gl.useProgram( program );


	if( gl.getError() !== gl.NO_ERROR ) console.log( gl.getError() );

	//todo: this shouldn't be here
	gl.uniform2f( program.tiles, tiles.x, tiles.y );
	gl.uniform2f( program.dataRange, dataRange.min, dataRange.max );
	gl.uniform1i( program.samplingRate, samplingRate );
	gl.uniform1f( program.alphaCorrection, alphaCorrection );

	gl.activeTexture( gl.TEXTURE0 );
	gl.bindTexture( backfaceFrameBuffer.type, backfaceFrameBuffer.texture );
	gl.uniform1i( program.backfaceTexture, 0 );

	gl.activeTexture( gl.TEXTURE1 );
	gl.bindTexture( volumeFrameBuffer.type, volumeFrameBuffer.texture );
	gl.uniform1i( program.volumeTexture, 1 );

	if( transferTexture ) {
		gl.activeTexture( gl.TEXTURE2 );
		gl.bindTexture( gl.TEXTURE_2D, transferTexture );
		gl.uniform1i( program.transferTexture, 2 );
	}

	gl.uniformMatrix4fv( program.projectionMatrix, false, camera.projectionMatrix );
	gl.uniformMatrix4fv( program.modelViewMatrix, false, camera.modelViewMatrix );
	gl.uniformMatrix4fv( program.modelMatrix, false, camera.modelMatrix );

	if( gl.getError() !== gl.NO_ERROR ) console.log( gl.getError() );

	renderCube.call( this, program );
}

//Render a 3D box using current program
function renderCube( program ) {
	let gl = this.context;

	gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT );

	gl.enable( gl.DEPTH_TEST );


	if( gl.getError() !== gl.NO_ERROR ) console.log( gl.getError() );

	gl.bindBuffer( gl.ARRAY_BUFFER, this.position3DBuffer );
	gl.vertexAttribPointer( program.position, 3, gl.FLOAT, false, 0, 0 );

	if( gl.getError() !== gl.NO_ERROR ) console.log( gl.getError() );

	gl.bindBuffer( gl.ARRAY_BUFFER, this.texCoord3DBuffer );
	gl.vertexAttribPointer( program.texCoord, 3, gl.FLOAT, false, 0, 0 );

	if( gl.getError() !== gl.NO_ERROR ) console.log( gl.getError() );

	gl.drawArrays( gl.TRIANGLES, 0, 36 );

	if( gl.getError() !== gl.NO_ERROR ) console.log( gl.getError() );

	gl.disable( gl.DEPTH_TEST );

	gl.bindBuffer( gl.ARRAY_BUFFER, null );
}

//Render a 2D quad using current program
function renderQuad( program ) {
	let gl = this.context;

	gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT );

	gl.bindBuffer( gl.ARRAY_BUFFER, this.position2DBuffer );
	gl.vertexAttribPointer( program.position, 2, gl.FLOAT, false, 0, 0 );

	gl.bindBuffer( gl.ARRAY_BUFFER, this.texCoord2DBuffer );
	gl.vertexAttribPointer( program.texCoord, 2, gl.FLOAT, false, 0, 0 );

	gl.drawArrays( gl.TRIANGLES, 0, 6 );
	gl.bindBuffer( gl.ARRAY_BUFFER, null );
}

//Render a 2D quad to all layers of 3D texture using current program
function renderTo3DTexture( program, framebuffer, depth ) {
	let gl = this.context;

	gl.bindFramebuffer( gl.FRAMEBUFFER, framebuffer.buffer );
	gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT );

	let tile_width = framebuffer.width / tiles.x;
	let tile_height = framebuffer.height / tiles.y;

	for( let layer = 0; layer < depth; layer++ ) {
		gl.uniform1f( program.layer, layer );

		if( gl.type === 'webgl2' ) {
			gl.viewport( 0, 0, volumeDimensions.x, volumeDimensions.y );
			//set texture layer for webgl 2.0
			gl.framebufferTextureLayer( gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, framebuffer.texture, 0, layer );
		} else {
			//fallback solution for webgl 1.0
			let offset_x = tile_width * ( layer % tiles.x );
			let offset_y = tile_height * Math.floor( layer / tiles.x );

			//gl.scissor( offset_x, offset_y, tile_width, tile_height );
			gl.viewport( offset_x, offset_y, tile_width, tile_height );
		}

		renderQuad.call( this, program );
	}

	gl.bindFramebuffer( gl.FRAMEBUFFER, null );
}

//render texture into screen / for debugging
function renderTextureToViewport( program, texture ) {
	let gl = this.context;

	gl.viewport( 0, 0, this.width, this.height );
	gl.clearColor( 0., 0., 0., 1. );
	gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT );
	gl.useProgram( program );

	//todo: this shouldn't be here
	gl.uniform2f( program.tiles, tiles.x, tiles.y );

	gl.activeTexture( gl.TEXTURE0 );
	gl.bindTexture( gl.TEXTURE_2D, texture );
	gl.uniform1i( program.tex, 0 );

	renderQuad.call( this, program );

	gl.bindTexture( gl.TEXTURE_2D, null );
}

//let stats = new Stats();
//stats.showPanel( 0 ); // 0: fps, 1: ms, 2: mb, 3+: custom
//document.body.appendChild( stats.dom );

////////////////////////////////////////////////////////////////////////////////
// UI CONTROLS
////////////////////////////////////////////////////////////////////////////////


var Controls = function() {
	this.volume = volumePath;
	this.dimension_x = volumeDimensions.x;
	this.dimension_y = volumeDimensions.y;
	this.dimension_z = volumeDimensions.z;
	this.samplingRate = samplingRate;
	this.alphaCorrection = alphaCorrection;
};

var gui = new dat.GUI();
var controls = new Controls();

// different volume selected from dropdown
function onVolumeChanged( value ) {
	volumePath = value;

	initVolume();
}

function initVolume( value ) {
	init( canvas );

	f_volume.remove( volume_downsample_x );
	f_volume.remove( volume_downsample_y );
	f_volume.remove( volume_downsample_z );
	controls.dimension_x = volumeDimensions.x;
	controls.dimension_y = volumeDimensions.y;
	controls.dimension_z = volumeDimensions.z;
	volume_downsample_x = f_volume.add( controls, 'dimension_x',
		{   [ datasetDimensions.x + ' (original)' ]: datasetDimensions.x,
			[ datasetDimensions.x / 2 ]: datasetDimensions.x / 2,
			[ datasetDimensions.x / 4 ]: datasetDimensions.x / 4,
			[ datasetDimensions.x / 8 ]: datasetDimensions.x / 8 } ).listen();
	volume_downsample_y = f_volume.add( controls, 'dimension_y',
		{   [ datasetDimensions.y + ' (original)' ]: datasetDimensions.y,
			[ datasetDimensions.y / 2 ]: datasetDimensions.y / 2,
			[ datasetDimensions.y / 4 ]: datasetDimensions.y / 4,
			[datasetDimensions.y / 8 ]: datasetDimensions.y / 8 } ).listen();
	volume_downsample_z = f_volume.add( controls, 'dimension_z',
		{   [ datasetDimensions.z + ' (original)' ]: datasetDimensions.z,
			[ datasetDimensions.z / 2 ]: datasetDimensions.z / 2,
			[ datasetDimensions.z / 4 ]: datasetDimensions.z / 4,
			[ datasetDimensions.z / 8 ]: datasetDimensions.z / 8 } ).listen();
}

var f_volume = gui.addFolder( 'Volume' );

var volume_select = f_volume.add( controls, 'volume', volumes );

var volume_downsample_x = f_volume.add( controls, 'dimension_x',
	{   [ datasetDimensions.x + ' (original)' ]: datasetDimensions.x,
		[ datasetDimensions.x / 2 ]: datasetDimensions.x / 2,
		[ datasetDimensions.x / 4 ]: datasetDimensions.x / 4,
		[ datasetDimensions.x / 8 ]: datasetDimensions.x / 8 } ).listen();
var volume_downsample_y = f_volume.add( controls, 'dimension_y',
	{   [ datasetDimensions.y + ' (original)' ]: datasetDimensions.y,
		[ datasetDimensions.y / 2 ]: datasetDimensions.y / 2,
		[ datasetDimensions.y / 4 ]: datasetDimensions.y / 4,
		[datasetDimensions.y / 8 ]: datasetDimensions.y / 8 } ).listen();
var volume_downsample_z = f_volume.add( controls, 'dimension_z',
	{   [ datasetDimensions.z + ' (original)' ]: datasetDimensions.z,
		[ datasetDimensions.z / 2 ]: datasetDimensions.z / 2,
		[ datasetDimensions.z / 4 ]: datasetDimensions.z / 4,
		[ datasetDimensions.z / 8 ]: datasetDimensions.z / 8 } ).listen();

var volume_samplingRate = f_volume.add( controls, 'samplingRate', 1., 1000. ).step( 1. );
var volume_alphaCorrection = f_volume.add( controls, 'alphaCorrection', 0., 1. ).step( 0.001 );

volume_downsample_x.onChange( function( value ) {
	volumeDimensions.x = value;
});

volume_downsample_y.onChange( function( value ) {
	volumeDimensions.y = value;
});

volume_downsample_z.onChange( function( value ) {
	volumeDimensions.z = value;
});

volume_samplingRate.onChange( function( value ) {
	samplingRate = value;
});
volume_alphaCorrection.onChange( function( value ) {
	alphaCorrection = value;
});

volume_select.onFinishChange( onVolumeChanged );
volume_downsample_x.onFinishChange( initVolume );
volume_downsample_y.onFinishChange( initVolume );
volume_downsample_z.onFinishChange( initVolume );
volume_samplingRate.onFinishChange( requestRendering );
volume_alphaCorrection.onFinishChange( requestRendering );

////////////////////////////////////////////////////////////////////////////////
// MOUSE EVENTS
////////////////////////////////////////////////////////////////////////////////

var leftMouseDown = false;
var rightMouseDown = false;

let mousePos,
	prevMousePos;

canvas.addEventListener( 'mousedown', onMouseDownEvent );

//suppress context menu on right-click
canvas.oncontextmenu  = function( event ) {
	return false;
};

// converts global mouse coordinates to canvas-specific coordinates
function getMousePos( elem, event ) {
	var rect = elem.getBoundingClientRect();
	return {
		x: event.clientX - rect.left,
		y: event.clientY - rect.top
	};
}

function getNormalizedMousePos( elem, event ) {
	var mouseCoords = getMousePos( elem, event );
	return [ mouseCoords.x / elem.width - 0.5, mouseCoords.y / elem.height - 0.5 ];
}

function onMouseDownEvent( event ) {
	if ( event.button == 0 )
		leftMouseDown = true;
	else if ( event.button == 2 )
		rightMouseDown = true;

	prevMousePos = getNormalizedMousePos( event.target, event );

	document.addEventListener( 'mousemove', onMouseMoveEvent );
	document.addEventListener( 'mouseup', onMouseUpEvent, { once: true } );
	//handle mouse leaving window
	document.addEventListener( 'mouseout', onMouseUpEvent, { once: true } );
}

function onMouseUpEvent( event ) {
	event.preventDefault();
	leftMouseDown = false;
	rightMouseDown = false;

	document.removeEventListener( 'mouseup', onMouseMoveEvent );
}

function onMouseMoveEvent( event ) {
	event.preventDefault();
	event.stopPropagation();

	mousePos = getNormalizedMousePos( event.target, event );

	//only rerender if mouseposition has changed from previous
	let dx = mousePos.x - prevMousePos.x,
		dy = mousePos.y - prevMousePos.y;
	if( Math.abs( dx ) < 1e-6 && Math.abs( dy ) < 1e-6 ) return;

	if( leftMouseDown ) {
		camera.rotate( mousePos, prevMousePos );
	} else if( rightMouseDown ) {
		camera.pan( [ dx , dy ] );
	}

	prevMousePos = mousePos;

	camera.update();

	requestRendering();
	return false;
}