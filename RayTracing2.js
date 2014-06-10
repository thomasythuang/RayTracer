//  Thomas Huang
//  EECS 395 Intermediate Graphics (Spring 2014)
//  Project B: Chessboard
//
//  This project uses ray-tracing to display a scene without using WebGL's camera
//  It is named Chessboard due to the appearance of the ground plane used
//  
//  This project uses shaders in the html file instead of the javascript file.
//  This makes reading and editing the shader code substantially easier.
//  Additionally, all of the ray-tracing calculations are performed in the shaders.
//  The javascript file defines variables (such as camera position, light position,
//  .etc) and then passes them to the shaders for calculations. There are strong
//  advantages and disadvantages to this method, which are outlined in the project
//  report.
//

//Global Variables
var gl;
var DEFAULT_EYE_X = 0, DEFAULT_EYE_Y = 15, DEFAULT_EYE_Z = 20;
var DEFAULT_LIGHT_X = 20, DEFAULT_LIGHT_Y = 20, DEFAULT_LIGHT_Z = -20;
var DEFAULT_LOOK = 0.00;
var EyeX = DEFAULT_EYE_X, EyeY = DEFAULT_EYE_Y, EyeZ = DEFAULT_EYE_Z;//Eye Position
var lookX = DEFAULT_LOOK, lookY = DEFAULT_LOOK, lookZ = DEFAULT_LOOK;//Look at Point
var light1X = DEFAULT_LIGHT_X, light1Y = DEFAULT_LIGHT_Y, light1Z = DEFAULT_LIGHT_Z;
var light2X = -1 * DEFAULT_LIGHT_X, light2Y = DEFAULT_LIGHT_Y, light2Z = -1 * DEFAULT_LIGHT_Z;
var rotStep = 0.05;      //Camera rotation step
//var paused = false;
var sceneNum = 1;       //Which scene is displayed
var depth = 1.0;        //User-adjustable recursion depth
var help = true;        //On/off for controls help
var light1Switch = 1;   //On/off for light 1
var light2Switch = 1;   //On/off for light 2
var lightNum = 1;       //Which light's info is displayed and adjustable
var AA = 0;
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
  light1 = gl.getUniformLocation(shaderProgram, "light1Dir")
  light2 = gl.getUniformLocation(shaderProgram, "light2Dir")
  sphere1Center = gl.getUniformLocation(shaderProgram, "sphere1Center");
  sphere2Center = gl.getUniformLocation(shaderProgram, "sphere2Center");
  sphere3Center = gl.getUniformLocation(shaderProgram, "sphere3Center");
  sphere4Center = gl.getUniformLocation(shaderProgram, "sphere4Center");
  cube1Center = gl.getUniformLocation(shaderProgram, "cube1Center");
  sColor1 = gl.getUniformLocation(shaderProgram, "sColor1");
  sColor2 = gl.getUniformLocation(shaderProgram, "sColor2");
  sColor3 = gl.getUniformLocation(shaderProgram, "sColor3");
  sColor4 = gl.getUniformLocation(shaderProgram, "sColor4");
  cColor1 = gl.getUniformLocation(shaderProgram, "cColor1");
  aa_ID = gl.getUniformLocation(shaderProgram, "aAlias");
  depthID = gl.getUniformLocation(shaderProgram, "depth");
  light1On = gl.getUniformLocation(shaderProgram, "light1Switch");
  light2On = gl.getUniformLocation(shaderProgram, "light2Switch");
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

//Vector utility functions
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

function drawScene(num)
{
  //Various positions/colors for each scene
  if (num == 1){
    x1 = -0.5,  y1 = 1,     z1 = -3;      //Sphere
    x2 = 2,     y2 = 1,     z2 = 0;       //Sphere
    x3 = -2,    y3 = -1,    z3 = 1;       //Sphere
    x4 = 0,     y4 = -1.5,  z4 = -1;      //Sphere
    x5 = 2,     y5 = -1,    z5 = 2;       //Cube

    gl.uniform3f(sColor1, 1.0, 0.5725, 0.0);
    gl.uniform3f(sColor2, 1.0, 0.749, 0.0);
    gl.uniform3f(sColor3, 0.106, 0.106, 0.702);
    gl.uniform3f(sColor4, 0.043, 0.38, 0.517);
    gl.uniform3f(cColor1, 0.0, 0.9, 0.0);
  }
  else{
    x1 = 2.5,   y1 = 0,     z1 = -4;      //Sphere
    x2 = -2,    y2 = 1,     z2 = -1;      //Sphere
    x3 = 0,     y3 = -1.5,  z3 = 1;       //Sphere
    x4 = 0.5,   y4 = -1.5,  z4 = -3;      //Sphere
    x5 = 2,     y5 = -1,    z5 = 2;       //Cube

    gl.uniform3f(sColor1, 0.0, 0.8, 0.0);
    gl.uniform3f(sColor2, 0.0, 0.6, 0.6);
    gl.uniform3f(sColor3, 1.0, .455, 0.0);
    gl.uniform3f(sColor4, 1.0, 0.0, 0.0);
    gl.uniform3f(cColor1, 0.0, 0.9, 0.0);
  }

  cameraEye = { x: EyeX,                                    //Eye Point
                 y: EyeY,
                 z: EyeZ};
  cameraLookAt = { x:lookX, y:lookY, z:lookZ };             //LookAt Point

  cameraPersp = 6;

  up = { x: 0, y: 1, z: 0 };                                //Up Vector

  cameraDir = normalize(vectSub(cameraLookAt, cameraEye));  //View direction vector

  cameraLeft = normalize(crossProd(cameraDir, up));
  cameraUp = normalize(crossProd(cameraLeft, cameraDir));
  cameraCenter = vectAdd(cameraEye, vectMul(cameraDir, cameraPersp));
  cameraTopLeft  = vectAdd(vectAdd(cameraCenter, cameraUp),
                           vectMul(cameraLeft, ratio));
  cameraBotLeft  = vectAdd(vectSub(cameraCenter, cameraUp),
                           vectMul(cameraLeft, ratio));
  cameraTopRight = vectSub(vectAdd(cameraCenter, cameraUp),
                           vectMul(cameraLeft, ratio));
  cameraBotRight = vectSub(vectSub(cameraCenter, cameraUp),
                           vectMul(cameraLeft, ratio));

  corners = [];
  pushVec(cameraTopRight, corners);
  pushVec(cameraTopLeft, corners);
  pushVec(cameraBotRight, corners);
  pushVec(cameraBotLeft, corners);

  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(corners), gl.STATIC_DRAW);

  light2Pos = {x: light2X,
              y: light2Y,
              z: light2Z};
  light1Pos = {x: light1X,
              y: light1Y,
              z: light1Z};

  light1Dir = normalize(vectSub(light1Pos, cameraLookAt));
  light2Dir = normalize(vectSub(light2Pos, cameraLookAt));

  gl.uniform3f(cameraPos, cameraEye.x, cameraEye.y, cameraEye.z);
  gl.uniform3f(light1, light1Dir.x, light1Dir.y, light1Dir.z);
  gl.uniform3f(light2, light2Dir.x, light2Dir.y, light2Dir.z);
  gl.uniform3f(sphere1Center, x1, y1, z1);
  gl.uniform3f(sphere2Center, x2, y2, z2);
  gl.uniform3f(sphere3Center, x3, y3, z3);
  gl.uniform3f(sphere4Center, x4, y4, z4);
  gl.uniform3f(cube1Center, x5, y5, z5);
  gl.uniform1f(depthID, depth);
  gl.uniform1i(light1On, light1Switch);
  gl.uniform1i(light2On, light2Switch);
  gl.uniform1i(aa_ID, AA);

  gl.viewport(0, 0, canvas.width/2, canvas.height);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

  gl.viewport(canvas.width/2, 0, canvas.width/2, canvas.height);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

  updateValues();
}

function tick()
{
  drawScene(sceneNum);
  //console.log("running");
  requestAnimationFrame(function(){
      tick();            
  });
}

var ratio = 1; 

function keydown(ev){
  switch(ev.keyCode)
  {
    case 69:        //E key
      EyeZ += 1;
      break;
    case 81:        //Q key
      EyeZ -= 1;
      break;
    case 87:        //W key
      EyeY += 1;
      break;
    case 83:        //S key
      EyeY -= 1;
      break;
    case 65:        //A key
      EyeX += 1;
      break;
    case 68:        //D key
      EyeX -= 1;
      break;
      case 79:        //O key
      lookZ += 0.5;
      break;
    case 85:        //U key
      lookZ -= 0.5;
      break;
    case 73:        //I key
      lookY += 0.5;
      break;
    case 75:        //K key
      lookY -= 0.5;
      break;
    case 74:        //J key
      lookX += 0.5;
      break;
    case 76:        //L key
      lookX -= 0.5;
      break;
    case 100:        //Num4 key
      if (lightNum > 1)
        light2Z -= 1;
      else
        light1Z -= 1;
      break;
    case 102:        //Num6 key
      if (lightNum > 1)
        light2Z += 1;
      else
        light1Z += 1;
      break;
    case 101:        //Num5 key
      if (lightNum > 1)
        light2Y += 1;
      else
        light1Y += 1;
      break;
    case 98:        //Num2 key
      if (lightNum > 1)
        light2Y -= 1;
      else
        light1Y -= 1;
      break;
    case 97:        //Num1 key
      if (lightNum > 1)
        light2X += 1;
      else
        light1X += 1;
      break;
    case 99:        //Num3 key
      if (lightNum > 1)
        light2X -= 1;
      else
        light1X -= 1;
      break;
    case 32:        //Space bar: pause
      pause();
      break; 
    case 82:        //R: Reset camera
      EyeX = DEFAULT_EYE_X;
      EyeY = DEFAULT_EYE_Y;
      EyeZ = DEFAULT_EYE_Z;
      lookX = lookY = lookZ = DEFAULT_LOOK;
      light1X = DEFAULT_LIGHT_X;
      light1Y = DEFAULT_LIGHT_Y;
      light1Z = DEFAULT_LIGHT_Z;
      light2X = DEFAULT_LIGHT_X * -1;
      light2Y = DEFAULT_LIGHT_Y;
      light2Z = DEFAULT_LIGHT_Z * -1;
      depth = 1;
      light1Switch = 1;
      light2Switch = 1;
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
      if (depth < 3.0)
        depth++;
      break;
    case 188:       //Comma
      if (depth > 0.0)
        depth--;
      break;
    case 187:       //Equals Sign
      if (lightNum > 1)
        lightNum = 1;
      else
        lightNum = 2;
      break;
    case 219:       //Open Bracket
      if (light1Switch > 0)
        light1Switch = 0;
      else
        light1Switch = 1;
      break;
    case 221:       //Closed Bracket
      if (light2Switch > 0)
        light2Switch = 0;
      else
        light2Switch = 1;
      break;
    case 220:       //Back Slash
      if (AA > 0)
        AA = 0;
      else
        AA = 1;
      break;
    case 72:        //H key
      if (help)
      {
        controls1.style.display="none";
      }
      else
      {
        controls1.style.display="block";
      }
      help = !help;
      break; 
    default: return;
  }
}

//Rotate the camera left/right/up/down
function rotate(dir){
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
    case "up":
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

//Update the values in the help box below the display
function updateValues(){
  xpos.innerHTML = Math.floor(EyeX * -10000)/10000;
  ypos.innerHTML = Math.floor(EyeY * 10000)/10000;
  zpos.innerHTML = Math.floor(EyeZ * 10000)/10000;

  lookx.innerHTML = Math.floor(lookX * -10000)/10000;
  looky.innerHTML = Math.floor(lookY * 10000)/10000;
  lookz.innerHTML = Math.floor(lookZ * 10000)/10000;

  //If the first light is selected, display its position and direction
  if (lightNum == 1){
    lx.innerHTML = Math.floor(light1X * -10000)/10000;
    ly.innerHTML = Math.floor(light1Y * 10000)/10000;
    lz.innerHTML = Math.floor(light1Z * 10000)/10000;

    lvx.innerHTML = Math.floor(light1Dir.x * 10000)/10000;
    lvy.innerHTML = Math.floor(light1Dir.y * -10000)/10000;
    lvz.innerHTML = Math.floor(light1Dir.z * -10000)/10000;
  }
  //If the second light is selected, display its position and direction
  else{
    lx.innerHTML = Math.floor(light2X * -10000)/10000;
    ly.innerHTML = Math.floor(light2Y * 10000)/10000;
    lz.innerHTML = Math.floor(light2Z * 10000)/10000;

    lvx.innerHTML = Math.floor(light2Dir.x * 10000)/10000;
    lvy.innerHTML = Math.floor(light2Dir.y * -10000)/10000;
    lvz.innerHTML = Math.floor(light2Dir.z * -10000)/10000;
  }

  if (AA > 0)
    antialiasing.innerHTML = "On";
  else
    antialiasing.innerHTML = "Off";

  lightN.innerHTML = lightNum;

  rDepth.innerHTML = depth;
}