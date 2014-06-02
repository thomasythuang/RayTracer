//3456789_123456789_123456789_123456789_123456789_123456789_123456789_123456789_
// (JT: why the numbers? counts columns, helps me keep 80-char-wide listings)
//
// Chap 5: TexturedQuad.js (c) 2012 matsuda and kanda
//					"WebGL Programming Guide" pg. 163
// became:
//
//	traceWeek01_TexturedDisplay.js 	MODIFIED for EECS 351-1, 
//																	Northwestern Univ. Jack Tumblin
//	--add comments
//	--two side-by-side viewports: 
//			LEFT:	--3D line-drawing preview
//			RIGHT:--texture-map from a Uint8Array object.  
//							(Not all versions of WebGL can read the Float32Array
//							(made by our ray-tracer; convert it to 8-bit integer
//							(by rounding: intRGB = floatRGB*255.5
//			(see 351-1 starter code: 7.11.JT_HelloCube_Resize.js, .html)
//

// HOW DO WE CONSTRUCT A CAMERA?==========================
//==============================================================================
// A perspective camera for ray-tracing, specified in 'world' coordinate system
// by vrp,lookAtPt,vup; iLeft,iRight,iTop,iBot; xmax,ymax.
//
//     Users position and aim the camera by specifying two points and one vector
// in world-space.  The 'view reference point' (vrp) sets camera position; the
// 'lootAt' point sets the cameras' direction-of-gaze, and the 'view up' vector
// (vup) specifies a world-space direction that will appear vertical in the
// camera image.
//     From (vrp,lookAtPt,vup) we compute a (right-handed) camera coord. system
// consisting of an origin point and 3 orthonormal vectors U,V,N.
// (corresponding to eye-space x,y,z vector directions)
// The coord. system's origin point == 'vrp', and we describe the coordinate
// axes by the unit-length world-space vectors U,V,N. To compute these vectors,
// use N = ||vrp-lookAtPt||, U= vup cross N; V= N cross U.  We can easily
// convert a 3D point from camera coords (u,v,n) to world-space coords (x,y,z):
// we start at the camera's origin (vrp), add U,V,N axis vectors weighted by
// the point's u,v,n coords: by the coords (x,y,z) = vrp + U*u + V*v + N*n.
//     Users set the camera's internal parameters by choosing 6 numbers in the
// the camera coordinate system. Here, the 'eye point' or 'center of projection'
// is the origin: (u,v,n)=0,0,0; the camera viewing direction is the -N axis,
// and the U,V axes set the camera image's vertical and horizontal directions
// (x,y). We specify the image in the camera's n=-1 plane; it is the view from
// the origin through the 'image rectangle' with these 4 user-specified corners:
//  	            (iLeft, iTop, -1) (iRight, iTop, -1)
//	                (iLeft, iBot, -1) (iRight, iBot, -1) in  (u,v,n) coords.
// (EXAMPLE: If the user set iLeft=-1, iRight=+1, iTop=+1, iBot = -1, then our
// image rectangle is a square, centered on the -N axis, and our camera's
// field-of-view spans +/- 45 degrees horizontally, +/- 45 degrees vertically.)
//
// Users specify resolution of this image rectangle in pixels (xmax,ymax), and
// the pixels divide the image rectangle into xsize,ysize 'little squares'. Each
// little square has the same width (ufrac) and height (vfrac), where:
//     ufrac = (iRight - iLeft)/xmax;  vfrac = (iTop - iBot)/ymax.
// (note: keep ufrac/vfrac =1, so the image won't appear stretched or squashed).
// The little square at the lower-left corner of the image rectangle holds the
// pixel (0,0), but recall that the pixel is NOT that little square! it is the
// POINT AT THE SQUARE'S CENTER; thus pixel (0,0) location in u,v,n coords is:
//               (iLeft +    0.5*ufrac,  iBot +    0.5*vfrac, -1).
// Similarly, pixel(x,y) location in u,v,n is:
//      uvnPix = (iLeft + (x+0.5)*ufrac, iBot + (y+0.5)*vfrac, -1).
//
// With uvnPix, we can easily make the 'eye' ray in (u,v,n) coords for the (x,y)
// pixel; the ray origin is (0,0,0), and the ray direction vector is
// uvnPix - (0,0,0) = uvnPix. However, we need an eyeRay in world-space coords;
// To convert, replace the ray origin with vrp (already in world-space coords),
// and compure ray direction as a coordinate-weighted sum of the unit-length
// U,V,N axis vectors; eye.dir = uvnPix.u * U + uvnPix.v * V + uvnPix.n * N.
// This 'weighted sum' is just a matrix multiply; cam2world * uvnPix,
// where U,V,N unit-length vectors are the columns of cam2world matrix.
//
// Finally, to move the CCamera in world space, just translate its VRP;
// to rotate CCamera around its VRP, just rotate the u,v,n axes (pre-multiply
// cam2world matrix with a rotation matrix).
//=============================================================================

// Vertex shader program----------------------------------
var VSHADER_SOURCE =
  'attribute vec4 a_Position;\n' +
  'attribute vec4 b_Position;\n' + 
  'attribute vec2 a_TexCoord;\n' +
  'uniform mat4 u_MvpMatrix;\n' +
  'uniform mediump int u_isTexture; \n' +             // texture/not-texture flag
  'varying vec2 v_TexCoord;\n' +
  'void main() {\n' +
  '  if(u_isTexture > 0) {  \n' +
    '  gl_Position = a_Position;\n' +
    '  v_TexCoord = a_TexCoord;\n' +
    '  } \n' +
  '  else { \n' +
  '  gl_Position = u_MvpMatrix * b_Position;\n' +
  //'  gl_Position = b_Position; \n' + 
  '  } \n' +
  '}\n';

// Fragment shader program--------------------------------
var FSHADER_SOURCE =
  '#ifdef GL_ES\n' +
  'precision mediump float;\n' +
  '#endif\n' +
  'uniform int u_isTexture; \n' +							// texture/not-texture flag
  'uniform sampler2D u_Sampler;\n' +
  'varying vec2 v_TexCoord;\n' +
  'void main() {\n' +
  '  if(u_isTexture > 0) {  \n' +
  '  	 gl_FragColor = texture2D(u_Sampler, v_TexCoord);\n' +
  '  } \n' +
  '  else { \n' +
  '	 	 gl_FragColor = vec4(1.0, 0.2, 0.2, 1.0); \n' +
  '  } \n' +
  '}\n';

//Global Vars:
var u_isTexture = 0;							// ==0 false--use fixed colors in frag shader
																	// ==1 true --use texture-mapping in frag shader
var u_isTextureID = 0;						// GPU location of this uniform var
var mvpMatrix = new Matrix4();
var DEFAULT_EYE_X = 20, DEFAULT_EYE_Y = 15, DEFAULT_EYE_Z = 20;
var DEFAULT_LOOK = 0.00;
var EyeX = DEFAULT_EYE_X, EyeY = DEFAULT_EYE_Y, EyeZ = DEFAULT_EYE_Z;//Eye Position
var lookX = DEFAULT_LOOK, lookY = DEFAULT_LOOK, lookZ = DEFAULT_LOOK;//Look at Point
var g_last = Date.now();
var rotSpeed = 0.05;      //Camera rotation speed
var paused = false;
var gl;

function main() {
//==============================================================================
  // Retrieve <canvas> element
  var canvas = document.getElementById('webgl');

  // Get the rendering context for WebGL
  gl = getWebGLContext(canvas);
  if (!gl) {
    console.log('Failed to get the rendering context for WebGL');
    return;
  }
	// re-size our canvas to fit the window:
//	browserResize();
  // Initialize shaders
  if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
    console.log('Failed to intialize shaders.');
    return;
  }

  var gridCount = makeGroundGrid();

  // Create,enable vertex buffer objects (VBO) in graphics hardware
  var n = initVertexBuffers(gl, gridCount);
  if (n < 0) {
    console.log('Failed to set the vertex information');
    return;
  }

	// Create, set uniform var to select fixed color vs texture map drawing:
	u_isTextureID = gl.getUniformLocation(gl.program, 'u_isTexture');
  if (!u_isTextureID) {
    console.log('Failed to get the GPU storage location of u_isTexture');
    return false;
  }
  
  // Get the storage location of u_MvpMatrix
  u_MvpMatrix = gl.getUniformLocation(gl.program, 'u_MvpMatrix');
  if (!u_MvpMatrix) { 
    console.log('Failed to get the storage location of u_MvpMatrix');
    return;
  }
  
  myScene = new CScene();

  // Specify how we will clear the WebGL context in <canvas>
  gl.clearColor(0.0, 0.0, 0.0, 1.0);				
  // gl.enable(gl.DEPTH_TEST); // CAREFUL! don't do depth tests for 2D!

  // Create, load, enable texture buffer object (TBO) in graphics hardware
  if (!initTextures(gl, n)) {
    console.log('Failed to intialize the texture.');
    //return;
  }

  //Event handler for key presses
  document.onkeydown = function(ev, n, myScene){keydown(ev, n, myScene);};
  ///*
  tick = function(n, scene) {
    if (paused)
      return;
    timeStep = animate();     //Get time passed since last screen redraw
    drawAll(n, scene);
    console.log("stop?");
    //meter.tick();                   //Tick for FPS meter
    requestAnimationFrame(function(){
      tick(n, scene);            
    });
  };
  tick(n, myScene); //*/

	// Draw the WebGL preview (right) and ray-traced result (left).
  //drawAll(n, myScene);
}

function keydown(ev, n, myScene){
  switch(ev.keyCode)
  {
    case 69:        //E key
      EyeZ += 1;
      //zpos.innerHTML = EyeZ;
      break;
    case 81:        //Q key
      EyeZ -= 1;
      //zpos.innerHTML = EyeZ;
      break;
    case 87:        //W key
      EyeY += 1;
      //ypos.innerHTML = EyeY; 
      break;
    case 83:        //S key
      EyeY -= 1;
      //ypos.innerHTML = EyeY;
      break;
    case 65:        //A key
      EyeX -= 1;
      //xpos.innerHTML = EyeX;
      break;
    case 68:        //D key
      EyeX += 1;
      //xpos.innerHTML = EyeX;
      break;
    case 85:        //U key
      lookZ -= 0.5;
      break;
    case 79:        //O key
      lookZ += 0.5;
      break;
    case 73:        //I key
      lookY += 0.5;
      break;
    case 75:        //K key
      lookY -= 0.5;
      break;
    case 74:        //J key
      lookX -= 0.5;
      break;
    case 76:        //L key
      lookX += 0.5;
      break;
    case 32:        //Space bar: pause
      paused = !paused;
      if (!paused)
        tick(n, myScene);
      break; 
    case 82:        //R: Reset camera
      EyeX = DEFAULT_EYE_X;
      EyeY = DEFAULT_EYE_Y;
      EyeZ = DEFAULT_EYE_Z;
      lookX = lookY = lookZ = DEFAULT_LOOK;
      break;
    case 37:        //Left arrow key
      rotate("left");
      break;
    case 39:        //Right arrow key
      rotate("right");
      break;
    case 38:        //Up arrow key
      rotate("up");
      break;
    case 40:        //Down arrow key
      rotate("down");
      break;
    /* case 72:        //H key
      if (help)
      {
        controls.innerHTML = "Press H for help <br> <br> <br> <br>";
        controls2.innerHTML = "";
        controls3.innerHTML = "";
      }
      else
      {
        controls.innerHTML = "Press H to toggle off help<br>A/D, W/S, Q/E: Move Camera along x/y/z<br>Left/Right,Up/Down: Pan/Tilt camera<br>J/L, I/K, U/O: Move LookAt point along x/y/z";
        //controls.innerHTML = "Press H to toggle off help<br>A and D: Move camera along X<br>W and S: Move camera along Y<br>Q and E: Move camera along Z";
        controls2.innerHTML = "R: Reset Camera<br>1-5: Change solver type<br>B: Toggle Wall dampening<br><br>";
        controls3.innerHTML = "";
      }
      help = !help;
      break; */
    default: return;
  }
  //drawAll(n, myScene);
}

function animate(){
  var now = Date.now();                       
  var elapsed = now - g_last;               
  g_last = now;  
  return elapsed;         //Return the amount of time passed.
}

//Rotation of camera: Up/down/left/right
function rotate(dir){
//Temp vars
var tempx = EyeX - lookX;
var tempy = EyeY - lookY;
var tempz = EyeZ - lookZ;

  switch(dir)
  {
    case "left":
      EyeX = tempx*Math.cos(rotSpeed) - tempz*Math.sin(rotSpeed) + lookX;
      EyeZ = tempz*Math.cos(rotSpeed) + tempx*Math.sin(rotSpeed) + lookZ;
      break;
    case "right":
      EyeX = tempx*Math.cos(rotSpeed) + tempz*Math.sin(rotSpeed) + lookX;
      EyeZ = tempz*Math.cos(rotSpeed) - tempx*Math.sin(rotSpeed) + lookZ;
      break;
    case "up":  //Fix up and down
      EyeY = tempy*Math.cos(rotSpeed) + tempz*Math.sin(rotSpeed) + lookY;
      EyeZ = tempz*Math.cos(rotSpeed) - tempy*Math.sin(rotSpeed) + lookX;
      break;
    case "down":
      EyeY = tempy*Math.cos(rotSpeed) - tempz*Math.sin(rotSpeed) + lookY;
      EyeZ = tempz*Math.cos(rotSpeed) + tempy*Math.sin(rotSpeed) + lookX;
      break;
    default:return;
  }
}

//Draw ground grid as well as constraints
function makeGroundGrid() {
//==============================================================================
// Create a list of vertices that create a large grid of lines in the x,y plane
// centered at x=y=z=0.  Draw this shape using the GL_LINES primitive.
  floatsPerVertex = 3;
  var xcount = 100;     // # of lines to draw in x,y to make the grid.
  var ycount = 100;   
  var xymax = 50.0;     // grid size; extends to cover +/-xymax in x and y. 
  
  // Create an (global) array to hold this ground-plane's vertices:
  gndVerts = new Float32Array(floatsPerVertex*2*(xcount+ycount));
            // draw a grid made of xcount+ycount lines; 2 vertices per line.
            
  var xgap = xymax/(xcount-1);    // HALF-spacing between lines in x,y;
  var ygap = xymax/(ycount-1);    // (why half? because v==(0line number/2))
  
  // First, step thru x values as we make vertical lines of constant-x:
  for(v=0, j=0; v<2*xcount; v++, j+= floatsPerVertex) {
    if(v%2==0) {  // put even-numbered vertices at (xnow, -xymax, 0)
      gndVerts[j  ] = -xymax + (v  )*xgap;       // x
      gndVerts[j+1] = 0.0                        // y
      gndVerts[j+2] = -xymax;                    // z
    }
    else {        // put odd-numbered vertices at (xnow, +xymax, 0).
      gndVerts[j  ] = -xymax + (v-1)*xgap;    // x
      gndVerts[j+1] = 0.0;                    // y
      gndVerts[j+2] = xymax;                  // z
    } /*
    gndVerts[j+3] = xColr[0];    
    gndVerts[j+4] = xColr[1];    
    gndVerts[j+5] = xColr[2];    */
  }
  // Second, step thru y values as wqe make horizontal lines of constant-y:
  // (don't re-initialize j--we're adding more vertices to the array)
  for(v=0; v<2*ycount; v++, j+= floatsPerVertex) {
    if(v%2==0) {    // put even-numbered vertices at (-xymax, ynow, 0)
      gndVerts[j  ] = -xymax;                     // x
      gndVerts[j+1] =  0.0;                       // y
      gndVerts[j+2] = -xymax + (v  )*ygap;        // z
    }
    else {          // put odd-numbered vertices at (+xymax, ynow, 0).
      gndVerts[j  ] = xymax;                      // x
      gndVerts[j+1] = 0.0;                        // y
      gndVerts[j+2] = -xymax + (v-1)*ygap;        // z
    } /*
    gndVerts[j+3] = yColr[0];     
    gndVerts[j+4] = yColr[1];     
    gndVerts[j+5] = yColr[2]; */
  }

  return gndVerts.length/3;
}

function initVertexBuffers(gl, gridCount) {
//==============================================================================

  var webGLverts = new Float32Array(gridCount*floatsPerVertex)
  //var webGLverts = new Float32Array([
  /*
    -1, 1, 0,   
    -1, -1, 0,
    1,  1, 0,
    1, -1, 0,
    1, -1, -2,
    -1, -1, -2,
    -1, 1, -2,
  ]);
  */
  ///*
  for (var p = 0; p < gridCount*floatsPerVertex; p++){
    webGLverts[p] = gndVerts[p];
  }
  //*/
  var n = webGLverts.length/3;
  console.log(webGLverts);
  console.log(gndVerts);

  // 4 vertices for a texture-mapped 'quad' (square) to fill almost all of the CVV
  var verticesTexCoords = new Float32Array(webGLverts.length*4/3);
  verticesTexCoords.set([
    // Quad vertex coordinates(x,y in CVV); texture coordinates tx,ty
    -0.95,  0.95,     0.0, 1.0,       // upper left corner,
    -0.95, -0.95,     0.0, 0.0,       // lower left corner,
     0.95,  0.95,     1.0, 1.0,       // upper right corner,
     0.95, -0.95,     1.0, 0.0,       // lower left corner.
  ]);

  // Create the vertex buffer object in the GPU
  var vertexTexCoordBufferID = gl.createBuffer();
  if (!vertexTexCoordBufferID) {
    console.log('Failed to create the buffer object');
    return -1;
  }
  var webGLvertsID = gl.createBuffer();
  if (!webGLvertsID){
    console.log('Failed to create the buffer object');
    return -1;
  }

  // Bind the this vertex buffer object to target (ARRAY_BUFFER).  
  // (Why 'ARRAY_BUFFER'? Because our array holds vertex attribute values.
  //	Our only other target choice: 'ELEMENT_ARRAY_BUFFER' for an array that 
  // holds indices into another array that holds vertex attribute values.)
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexTexCoordBufferID);
  gl.bufferData(gl.ARRAY_BUFFER, verticesTexCoords, gl.STATIC_DRAW);

  var FSIZE = verticesTexCoords.BYTES_PER_ELEMENT;
  //Get the storage location of a_Position, assign and enable buffer
  var a_PositionID = gl.getAttribLocation(gl.program, 'a_Position');
  if (a_PositionID < 0) {
    console.log('Failed to get the GPU storage location of a_Position');
    return -1;
  }
  gl.vertexAttribPointer(a_PositionID, 2, gl.FLOAT, false, FSIZE * 4, 0);
  gl.enableVertexAttribArray(a_PositionID);  // Enable the assignment of the buffer object

  // Get the storage location of a_TexCoord
  var a_TexCoordID = gl.getAttribLocation(gl.program, 'a_TexCoord');
  if (a_TexCoordID < 0) {
    console.log('Failed to get the GPU storage location of a_TexCoord');
    return -1;
  }
  // Assign the buffer object to a_TexCoord variable
  gl.vertexAttribPointer(a_TexCoordID, 2, gl.FLOAT, false, FSIZE*4, FSIZE*2);
  // Enable the assignment of the buffer object
  gl.enableVertexAttribArray(a_TexCoordID);  
  
  gl.bindBuffer(gl.ARRAY_BUFFER, webGLvertsID);
  gl.bufferData(gl.ARRAY_BUFFER, webGLverts, gl.STATIC_DRAW);

  //Get the storage location of b_Position, assign and enable buffer
  var b_PositionID = gl.getAttribLocation(gl.program, 'b_Position');
  if (b_PositionID < 0) {
    console.log('Failed to get the GPU storage location of b_Position');
    return -1;
  }
  //gl.vertexAttribPointer(b_PositionID, 2, gl.FLOAT, false, FSIZE * 2, 0);
  gl.vertexAttribPointer(b_PositionID, 3, gl.FLOAT, false, FSIZE * 3, 0);
  gl.enableVertexAttribArray(b_PositionID);  // Enable the assignment of the buffer object
  
  return n;
}

function initTextures(gl, n) {
//==============================================================================
  var textureID = gl.createTexture();   // Create a texture object 
  if (!textureID) {
    console.log('Failed to create the texture object on the GPU');
    return false;
  }

  // Get the storage location of u_Sampler
  var u_SamplerID = gl.getUniformLocation(gl.program, 'u_Sampler');
  if (!u_SamplerID) {
    console.log('Failed to get the GPU storage location of u_Sampler');
    return false;
  }
  var image = new Image();  // Create the image object
  if (!image) {
    console.log('Failed to create the image object for texture');
    return false;
  }
  // Here, the book's texture-mapping code uses the JavaScript 'Image' object 
  // to read an RGB image from a JPG file.  It seems that file-reading is the
  // *ONLY* way to create an 'Image' object -- we can't create one from an
  // array of pixel values.
  //  SEE: http://www.proglogic.com/learn/javascript/lesson10.php
	//				http://www.w3schools.com/jsref/dom_obj_image.asp
	  
/*   
 DELETE THIS ------------OLD WAY (read image from book)
  // Register the HTML-5 event handler to call when we need to load an image:
  image.onload = function(){ loadTexture(gl,n,textureID,u_SamplerID, image); };
  // Tell the browser to load an image
  image.src = '../resources/blueflower.jpg';
  return true;
}

function loadTexture(gl, n, textureID, u_SampleID, myImg) {
//==============================================================================
// HTML-5 event-handler, called by the browser to read an image from a file,
// then put the image data into the WebGL texture object (textureID) we made.

//  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1); // Flip the image's y axis;
  																	// WebGL needs origin at lower left.

//---------------------END OLD WAY
*/

	// 2D color image:  8-bit unsigned integers in a 256*256*3 array
	// to store r,g,b,r,g,b integers (8-bit)
	// WebGL texture map sizes MUST be a power-of-two (2,4,8,16,32,64,...4096)
	// with origin at lower-left corner
	var xsiz = 256;
	var ysiz = 256;
  myImg = new Uint8Array(xsiz*ysiz*3);	// r,g,b; r,g,b; r,g,b pixels

  for(var j=0; j< ysiz; j++) {					// for the j-th row of pixels
  	for(var i=0; i< xsiz; i++) {				// and the i-th pixel on that row,
	  	var idx = (j*xsiz + i)*3;					// pixel (i,j) array index (red)
	  	if(i<xsiz/4 || j<ysiz/4) {
	  		myImg[idx   ] = i;								// 0 <= red <= 255
	  		myImg[idx +1] = j;								// 0 <= grn <= 255
	  		myImg[idx +2] = 0;								// 0 <= blu <= 255
  		}  
  	}
  }

  // Enable texture unit0 for our use
  gl.activeTexture(gl.TEXTURE0);
  // Bind the texture object we made in initTextures() to the target
  gl.bindTexture(gl.TEXTURE_2D, textureID);
  // Load the texture image into the GPU
  gl.texImage2D(gl.TEXTURE_2D, 	//  'target'--the use of this texture
  							0, 							//  MIP-map level (default: 0)
  							gl.RGB, 				// GPU's data format (RGB? RGBA? etc)
								256,						// image width in pixels,
								256,						// image height in pixels,
								0,							// byte offset to start of data
  							gl.RGB, 				// source/input data format (RGB? RGBA?)
  							gl.UNSIGNED_BYTE, 	// data type for each color channel				
								myImg);	// data source.
								
  // Set the WebGL texture-filtering parameters
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  // Set the texture unit 0 to be driVen by the sampler
  gl.uniform1i(u_SamplerID, 0);
	//drawAll(gl, n);
}

function drawAll(nV, gridCount) {
//==============================================================================
// Clear <canvas> color AND DEPTH buffer
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  // Use OpenGL/ WebGL 'viewports' to map the CVV to the 'drawing context',
	// (for WebGL, the 'gl' context describes how we draw inside an HTML-5 canvas)
	// Details? see
  //  https://www.khronos.org/registry/webgl/specs/1.0/#2.3
  //------------------------------------------
  // Draw in the LEFT viewport
  //------------------------------------------
	// CHANGE from our default viewport:
	// gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
	// to a smaller one:
	gl.viewport(0,  														// Viewport lower-left corner
							0,															// (x,y) location(in pixels)
  						gl.drawingBufferWidth/2, 				// viewport width, height.
  						gl.drawingBufferHeight);
  // select fixed-color drawing:  
  gl.uniform1i(u_isTextureID, 0);						// DON'T use texture,
  
  vpAspect = (gl.drawingBufferWidth/2) /          // On-screen aspect ratio for
            gl.drawingBufferHeight;           // this camera: width/height.

  mvpMatrix.setPerspective(45.0,        // fovy: y-axis field-of-view in degrees  
                                        // (top <-> bottom in view frustum)
                            vpAspect,   // aspect ratio: width/height
                            1, 100);    // near, far (always >0).

  mvpMatrix.lookAt( EyeX, EyeY, EyeZ,          // 'Center' or 'Eye Point',
                    lookX, lookY, lookZ,             // look-At point,
                    0, 1, 0);         // View UP vector, all in 'world' coords.
  gl.uniformMatrix4fv(u_MvpMatrix, false, mvpMatrix.elements);
  gl.drawArrays(gl.LINES, 0, nV);
  
 	//------------------------------------------
  // Draw in the RIGHT viewport:
  //------------------------------------------
	gl.viewport(gl.drawingBufferWidth/2, 				// Viewport lower-left corner
							0, 															// location(in pixels)
  						gl.drawingBufferWidth/2, 				// viewport width, height.
  						gl.drawingBufferHeight);
	gl.uniform1i(u_isTextureID, 1);					// DO use texture,
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4); 	// Draw the textured rectangle
  //----------------------------------------- 
  
}

function browserResize() {
//==============================================================================
// Called when user re-sizes their browser window , because our HTML file
// contains:  <body onload="main()" onresize="browserResize()">

  /* SOLUTION to a pesky problem: 
  The main() function retrieves our WebGL drawing context as the variable 'gl', then shares it as an argument to other functions.  
  That's not enough!
  How can we access the 'gl' canvas within functions that main() will NEVER call, such as the mouse and keyboard-handling functions, or winResize()? Easy! make our own local references to the current canvas and WebGL drawing
  context, like this: */

	var myCanvas = document.getElementById('webgl');	// get current canvas
	var myGL = getWebGLContext(myCanvas);							// and context:
	//Report our current browser-window contents:

 console.log('myCanvas width,height=', myCanvas.width, myCanvas.height);		
 console.log('Browser window: innerWidth,innerHeight=', 
																innerWidth, innerHeight);	// http://www.w3schools.com/jsref/obj_window.asp
	
	//Make a square canvas/CVV fill the SMALLER of the width/2 or height:
	if(innerWidth > 2*innerHeight) {  // fit to brower-window height
		myCanvas.width = 2*innerHeight-20;
		myCanvas.height = innerHeight-20;
	  }
	else {	// fit canvas to browser-window width
		myCanvas.width = innerWidth-20;
		myCanvas.height = 0.5*innerWidth-20;
	  }	 
}


//
// Ray Tracing Classes
//

//Master class for openGL + ray tracing
function CScene(){
  //Background sky color
  this.bgColor;

  //Initial value for recursive rays
  this.blackColor;

  //Ray-tracing camera object: eye-ray source
  this.raycam;

  //Recursion depth limit
  this.depthMax;

  //Number for shapes, materials, and lights
  this.itemCount;
  this.matCount;
  this.lampCount;

  //Arrays of shapes, materials, and light sources
  this.items = [];
  this.materials = [];
  this.lamps = [];
}

CScene.prototype.makeRayTracedImage = function(){

}

//Image buffer for ray-traced result
function CImgBuf(){
  this.buf;
}

CImgBuf.prototype.init = function(length){
  this.buf = new Float32Array(length);
}

//Defines frustum
function CCamera(){
  //View frustum
  this.iLeft;
  this.iRight;
  this.iBot;
  this.iTop;
  this.zNear;
}

//Make a 45 degree square camera at the origin
CCamera.prototype.makeCam = function(){

}
CCamera.prototype.makeEyeRay = function(xpos, ypos){
  var eyeRay;

  return eyeRay;
}

//Any kind of shape
function CGeom(){
  //FOR LINEGRID OBJECT
  //Where gridplane crosses z axis
  this.zVal;

  //Line spacing on gridplane in x,y directions
  this.xgap;
  this.ygap;

  //Fraction of xgap, ygap filled by the line color
  this.linewidth;

  //RGB colors for lines and space in between
  this.lineColor = [];
  this.gapColor = [];
}

//Draw in current coordinate system
CGeom.prototype.drawOpenGL = function(){

}

//Find color where hit by ray
CGeom.prototype.traceGrid = function(inRay){

}

//Generic Material (including textures)
function CMatl(){

}

//Generic light source
function CLight(){

}

//
// Ray-tracing primitives
//

//Simple ray-describing object
function CRay(){
  //Start point
  this.orig;

  //Positive direction vector
  this.dir;
}

//Info on collision of ray & objects
function CHit(){

}

//List of ray/object intersections for 1 ray
function CHitList(){

}

//Recursively find where the ray hit a shape
function Trace(geomList, hitNum, depth){

}

//Color at one hit point
function FindShade(){

}