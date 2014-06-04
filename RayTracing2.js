


//Global Variables
var gl;
var DEFAULT_EYE_X = 0, DEFAULT_EYE_Y = 15, DEFAULT_EYE_Z = 20;
var DEFAULT_LOOK = 0.00;
var EyeX = DEFAULT_EYE_X, EyeY = DEFAULT_EYE_Y, EyeZ = DEFAULT_EYE_Z;//Eye Position
var lookX = DEFAULT_LOOK, lookY = DEFAULT_LOOK, lookZ = DEFAULT_LOOK;//Look at Point
var g_last = Date.now();
var rotStep = 0.05;      //Camera rotation step
var paused = false;

function initGL(canvas) {
  try {
    gl = canvas.getContext("experimental-webgl");
    gl.viewport(0, 0, canvas.width, canvas.height);
  } catch(e) {
  }
  if (!gl) {
    alert("Could not initialize WebGL");
  }
}

function getShader(gl, id)
{
    var shaderScript = document.getElementById(id);
    if (!shaderScript)
        return null;

    var shader;
    if (shaderScript.type == "x-shader/x-fragment")
    {
        shader = gl.createShader(gl.FRAGMENT_SHADER);
    }
    else if (shaderScript.type == "x-shader/x-vertex")
    {
        shader = gl.createShader(gl.VERTEX_SHADER);
    }
    else
    {
        return null;
    }

    gl.shaderSource(shader, shaderScript.textContent);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS))
    {
        alert(gl.getShaderInfoLog(shader));
        return null;
    }

    return shader;
}

var shaderProgram;
var aVertexPosition;
function initShaders()
{
  var fragmentShader = getShader(gl, "shader-fs");
  var vertexShader = getShader(gl, "shader-vs");

  shaderProgram = gl.createProgram();
  gl.attachShader(shaderProgram, vertexShader);
  gl.attachShader(shaderProgram, fragmentShader);
  gl.linkProgram(shaderProgram);

  if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS))
  {
    alert("Could not initialise shaders");
  }

  gl.useProgram(shaderProgram);

  aVertexPosition = gl.getAttribLocation(shaderProgram, "aVertexPosition");
  gl.enableVertexAttribArray(aVertexPosition);

  aPlotPosition = gl.getAttribLocation(shaderProgram, "aPlotPosition");
  gl.enableVertexAttribArray(aPlotPosition);

  cameraPos = gl.getUniformLocation(shaderProgram, "cameraPos");
  sphere1Center = gl.getUniformLocation(shaderProgram, "sphere1Center");
  sphere2Center = gl.getUniformLocation(shaderProgram, "sphere2Center");
  sphere3Center = gl.getUniformLocation(shaderProgram, "sphere3Center");
  sphere4Center = gl.getUniformLocation(shaderProgram, "sphere4Center");
}


function initBuffers()
{
  vertexPositionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexPositionBuffer);
  var vertices = [
       1.0,  1.0,
      -1.0,  1.0,
       1.0, -1.0,
      -1.0, -1.0,
  ];
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexPositionBuffer);
  gl.vertexAttribPointer(aVertexPosition, 2, gl.FLOAT, false, 0, 0);


  var plotPositionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, plotPositionBuffer);
  gl.vertexAttribPointer(aPlotPosition, 3, gl.FLOAT, false, 0, 0);
}

function crossProd(v1, v2) {
  return { x: v1.y*v2.z - v2.y*v1.z,
           y: v1.z*v2.x - v2.z*v1.x,
           z: v1.x*v2.y - v2.x*v1.y };
}

function normalize(v) {
  l = Math.sqrt(v.x*v.x + v.y*v.y + v.z*v.z);
  return { x: v.x/l, y: v.y/l, z: v.z/l };
}

function vectAdd(v1, v2) {
  return { x: v1.x + v2.x, y: v1.y + v2.y, z: v1.z + v2.z };
}

function vectSub(v1, v2) {
  return { x: v1.x - v2.x, y: v1.y - v2.y, z: v1.z - v2.z };
}

function vectMul(v, l) {
  return { x: v.x*l, y: v.y*l, z: v.z*l };
}

function pushVec(v, arr) {
  arr.push(v.x, v.y, v.z);
}

t = 0;
function drawScene()
{
  x1 = -2;//Math.sin(t * 1.1) * 1.5;
  y1 = 2;//Math.cos(t * 1.3) * 1.5;
  z1 = -1;//Math.sin(t + Math.PI/3) * 1.5;
  x2 = 2;//Math.cos(t * 1.2) * 1.5;
  y2 = 2;//Math.sin(t * 1.4) * 1.5;
  z2 = 2;//Math.sin(t*1.25 - Math.PI/3) * 1.5;
  x3 = -1;//Math.cos(t * 1.15) * 1.5;
  y3 = 0;//Math.sin(t * 1.37) * 1.5;
  z3 = 1;//Math.sin(t*1.27) * 1.5;
  x4 = 0;
  y4 = -1;
  z4 = -1;

  cameraFrom = { x: EyeX,//Math.sin(t * 0.4) * 18,
                 y: EyeY,//Math.sin(t * 0.13) * 5 + 5,
                 z: EyeZ};//Math.cos(t * 0.4) * 18 };
  cameraTo = { x:lookX, y:lookY, z:lookZ };
  cameraPersp = 6;
  up = { x: 0, y: 1, z: 0 };
  cameraDir = normalize(vectSub(cameraTo, cameraFrom));

  cameraLeft = normalize(crossProd(cameraDir, up));
  cameraUp = normalize(crossProd(cameraLeft, cameraDir));
  // cameraFrom + cameraDir * cameraPersp
  cameraCenter = vectAdd(cameraFrom, vectMul(cameraDir, cameraPersp));
  // cameraCenter + cameraUp + cameraLeft * ratio
  cameraTopLeft  = vectAdd(vectAdd(cameraCenter, cameraUp),
                           vectMul(cameraLeft, ratio));
  cameraBotLeft  = vectAdd(vectSub(cameraCenter, cameraUp),
                           vectMul(cameraLeft, ratio));
  cameraTopRight = vectSub(vectAdd(cameraCenter, cameraUp),
                           vectMul(cameraLeft, ratio));
  cameraBotRight = vectSub(vectSub(cameraCenter, cameraUp),
                           vectMul(cameraLeft, ratio));


  //corners = [1.2, 1, -12, -1.2, 1, -12, 1.2, -1, -12, -1.2, -1, -12];
  corners = [];
  pushVec(cameraTopRight, corners);
  pushVec(cameraTopLeft, corners);
  pushVec(cameraBotRight, corners);
  pushVec(cameraBotLeft, corners);

  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(corners), gl.STATIC_DRAW);

  gl.uniform3f(cameraPos, cameraFrom.x, cameraFrom.y, cameraFrom.z);
  gl.uniform3f(sphere1Center, x1, y1, z1);
  gl.uniform3f(sphere2Center, x2, y2, z2);
  gl.uniform3f(sphere3Center, x3, y3, z3);
  gl.uniform3f(sphere4Center, x4, y4, z4);

  gl.viewport(0, 0, canvas.width/2, canvas.height);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

  gl.viewport(canvas.width/2, 0, canvas.width/2, canvas.height);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

  t += 0.03;
  if (t > Math.PI * 200) {
    t -= Math.PI * 200;
  }
}

var timer = 0;

var canvas;
function main()
{
  canvas = document.getElementById("canvas");
  initGL(canvas);
  initShaders()

  gl.clearColor(0.0, 0.0, 0.0, 1.0);

  gl.clearDepth(1.0);

  initBuffers();

  document.onkeydown = function(ev){keydown(ev);};

  tick();
}

function tick()
{
  drawScene();
  //console.log("running");
  requestAnimationFrame(function(){
      tick();            
  });
}

function pause()
{
  /*
  paused = !paused;
  if (paused) {
    tick();
  }
  else {
    cancelAnimationFrame(function(){
      tick();});
    return;
  }
  */
}

var ratio = 1; 

function keydown(ev){
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
      pause();
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
}

function rotate(dir){
//Temp vars
var tempx = EyeX - lookX;
var tempy = EyeY - lookY;
var tempz = EyeZ - lookZ;

  switch(dir)
  {
    case "left":
      EyeX = tempx*Math.cos(rotStep) - tempz*Math.sin(rotStep) + lookX;
      EyeZ = tempz*Math.cos(rotStep) + tempx*Math.sin(rotStep) + lookZ;
      break;
    case "right":
      EyeX = tempx*Math.cos(rotStep) + tempz*Math.sin(rotStep) + lookX;
      EyeZ = tempz*Math.cos(rotStep) - tempx*Math.sin(rotStep) + lookZ;
      break;
    case "up":  //Fix up and down
      EyeY = tempy*Math.cos(rotStep) + tempz*Math.sin(rotStep) + lookY;
      EyeZ = tempz*Math.cos(rotStep) - tempy*Math.sin(rotStep) + lookX;
      break;
    case "down":
      EyeY = tempy*Math.cos(rotStep) - tempz*Math.sin(rotStep) + lookY;
      EyeZ = tempz*Math.cos(rotStep) + tempy*Math.sin(rotStep) + lookX;
      break;
    default:return;
  }
}
/*
function resizeCanvas(w)
{
  if (w == -1) {
    document.getElementById('contrib').style.display = "none";
    canvas.style.display = "none";
    canvas.parentNode.style.position = "absolute";
    canvas.parentNode.style.top = 0;
    w = canvas.parentNode.parentNode.offsetWidth;
    ratio = w / canvas.parentNode.parentNode.offsetHeight;
    canvas.style.display = "";
  }
  else { 
    document.getElementById('contrib').style.display = "";
    ratio = 1.6;
    canvas.parentNode.style.position = "";
    canvas.parentNode.style.top = "";
    window.onresize = null; 
  }
  canvas.width = w;
  canvas.height = w / ratio;

  gl.viewport(0, 0, canvas.width, canvas.height);

  t -= 0.03;
  drawScene();
} 

//var resizeTimer = false; 

function fullScreen() {
  window.onresize = function() {
    if (resizeTimer) {
      clearTimeout(resizeTimer);
    }
    resizeTimer = setTimeout(function() {
      fullScreen();
    }, 100);
  };
  
  resizeCanvas(-1); 
}  */