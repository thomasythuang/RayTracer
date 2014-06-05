


//Global Variables
var gl;
var DEFAULT_EYE_X = 0, DEFAULT_EYE_Y = 15, DEFAULT_EYE_Z = 20;
var DEFAULT_LIGHT_X = 20, DEFAULT_LIGHT_Y = 20, DEFAULT_LIGHT_Z = -20;
var DEFAULT_LOOK = 0.00;
var EyeX = DEFAULT_EYE_X, EyeY = DEFAULT_EYE_Y, EyeZ = DEFAULT_EYE_Z;//Eye Position
var lookX = DEFAULT_LOOK, lookY = DEFAULT_LOOK, lookZ = DEFAULT_LOOK;//Look at Point
var lightX = DEFAULT_LIGHT_X, lightY = DEFAULT_LIGHT_Y, lightZ = DEFAULT_LIGHT_Z;
var g_last = Date.now();
var rotStep = 0.05;      //Camera rotation step
var paused = false;
var sceneNum = 1;
var depth = 1;

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
  light = gl.getUniformLocation(shaderProgram, "lightDir")
  sphere1Center = gl.getUniformLocation(shaderProgram, "sphere1Center");
  sphere2Center = gl.getUniformLocation(shaderProgram, "sphere2Center");
  sphere3Center = gl.getUniformLocation(shaderProgram, "sphere3Center");
  sphere4Center = gl.getUniformLocation(shaderProgram, "sphere4Center");
  color1 = gl.getUniformLocation(shaderProgram, "color1");
  color2 = gl.getUniformLocation(shaderProgram, "color2");
  color3 = gl.getUniformLocation(shaderProgram, "color3");
  color4 = gl.getUniformLocation(shaderProgram, "color4");
  depthID = gl.getUniformLocation(shaderProgram, "depth");
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
function drawScene(num)
{
  if (num == 1){
    x1 = -0.5,  y1 = 1,     z1 = -3;
    x2 = 2,     y2 = 1,     z2 = 0;
    x3 = -2,    y3 = -1,    z3 = 1;
    x4 = 0,     y4 = -1.5,  z4 = -1;

    gl.uniform3f(color1, 1.0, 0.5725, 0.0)
    gl.uniform3f(color2, 1.0, 0.749, 0.0)
    gl.uniform3f(color3, 0.106, 0.106, 0.702)
    gl.uniform3f(color4, 0.043, 0.38, 0.517)
  }
  else{
    x1 = 2.5,  y1 = 0,     z1 = -4;
    x2 = -2,     y2 = 1,     z2 = -1;
    x3 = 0,    y3 = -1.5,    z3 = 1;
    x4 = 0.5,     y4 = -1.5,  z4 = -3;

    gl.uniform3f(color1, 0.0, 0.8, 0.0)
    gl.uniform3f(color2, 0.0, 0.6, 0.6)
    gl.uniform3f(color3, 1.0, .455, 0.0)
    gl.uniform3f(color4, 1.0, 0.0, 0.0)
  }

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

  lightPos = {x: lightX,
              y: lightY,
              z: lightZ};
  lightDir = normalize(vectSub(lightPos, cameraTo));
  //lightDir = normalize(vectSub(cameraTo, lightPos));

  //corners = [1.2, 1, -12, -1.2, 1, -12, 1.2, -1, -12, -1.2, -1, -12];
  corners = [];
  pushVec(cameraTopRight, corners);
  pushVec(cameraTopLeft, corners);
  pushVec(cameraBotRight, corners);
  pushVec(cameraBotLeft, corners);

  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(corners), gl.STATIC_DRAW);

  gl.uniform3f(cameraPos, cameraFrom.x, cameraFrom.y, cameraFrom.z);
  gl.uniform3f(light, lightDir.x, lightDir.y, lightDir.z);
  gl.uniform3f(sphere1Center, x1, y1, z1);
  gl.uniform3f(sphere2Center, x2, y2, z2);
  gl.uniform3f(sphere3Center, x3, y3, z3);
  gl.uniform3f(sphere4Center, x4, y4, z4);
  gl.uniform1i(depthID, depth);

  gl.viewport(0, 0, canvas.width/2, canvas.height);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

  gl.viewport(canvas.width/2, 0, canvas.width/2, canvas.height);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

  updateValues();
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
  drawScene(sceneNum);
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
      EyeX += 1;
      //xpos.innerHTML = EyeX;
      break;
    case 68:        //D key
      EyeX -= 1;
      //xpos.innerHTML = EyeX;
      break;
      case 79:        //O key
      lookZ += 0.5;
      //zpos.innerHTML = EyeZ;
      break;
    case 85:        //U key
      lookZ -= 0.5;
      //zpos.innerHTML = EyeZ;
      break;
    case 73:        //I key
      lookY += 0.5;
      //ypos.innerHTML = EyeY; 
      break;
    case 75:        //K key
      lookY -= 0.5;
      //ypos.innerHTML = EyeY;
      break;
    case 74:        //J key
      lookX += 0.5;
      //xpos.innerHTML = EyeX;
      break;
    case 76:        //L key
      lookX -= 0.5;
      //xpos.innerHTML = EyeX;
      break;
    case 100:        //Num4 key
      lightZ -= 1;
      break;
    case 102:        //Num6 key
      lightZ += 1;
      break;
    case 101:        //Num5 key
      lightY += 1;
      break;
    case 98:        //Num2 key
      lightY -= 1;
      break;
    case 97:        //Num1 key
      lightX += 1;
      break;
    case 99:        //Num3 key
      lightX -= 1;
      break;
    case 32:        //Space bar: pause
      pause();
      break; 
    case 82:        //R: Reset camera
      EyeX = DEFAULT_EYE_X;
      EyeY = DEFAULT_EYE_Y;
      EyeZ = DEFAULT_EYE_Z;
      lookX = lookY = lookZ = DEFAULT_LOOK;
      lightX = DEFAULT_LIGHT_X;
      lightY = DEFAULT_LIGHT_Y;
      lightZ = DEFAULT_LIGHT_Z;
      depth = 1;
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
    case 49:        //1 Key
      sceneNum = 1;
      break;
    case 50:        //2 Key
      sceneNum = 2;
      break;
    case 190:       //Period
      if (depth < 3)
        depth++;
      break;
    case 188:       //Comma
      if (depth > 0)
        depth--;
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
  //updateValues(false);
}

function rotate(dir){
//Temp vars
var tempx = EyeX - lookX;
var tempy = EyeY - lookY;
var tempz = EyeZ - lookZ;

  switch(dir)
  {
    case "right":
      EyeX = tempx*Math.cos(rotStep) - tempz*Math.sin(rotStep) + lookX;
      EyeZ = tempz*Math.cos(rotStep) + tempx*Math.sin(rotStep) + lookZ;
      break;
    case "left":
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

function updateValues(){
  xpos.innerHTML = Math.floor(EyeX * -10000)/10000;
  ypos.innerHTML = Math.floor(EyeY * 10000)/10000;
  zpos.innerHTML = Math.floor(EyeZ * 10000)/10000;

  lookx.innerHTML = Math.floor(lookX * -10000)/10000;
  looky.innerHTML = Math.floor(lookY * 10000)/10000;
  lookz.innerHTML = Math.floor(lookZ * 10000)/10000;

  lx.innerHTML = Math.floor(lightX * -10000)/10000;
  ly.innerHTML = Math.floor(lightY * 10000)/10000;
  lz.innerHTML = Math.floor(lightZ * 10000)/10000;

  lvx.innerHTML = Math.floor(lightDir.x * 10000)/10000;
  lvy.innerHTML = Math.floor(lightDir.y * -10000)/10000;
  lvz.innerHTML = Math.floor(lightDir.z * -10000)/10000;

  rDepth.innerHTML = depth;
}