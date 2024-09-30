const worldSizeX = 51;
const worldSizeY = 51;

// Creating the world.
const world = generateMaze(worldSizeX, worldSizeY);

// Player details.
let playerPosX = 4;
let playerPosY = 4;

let playerSpeed = 0.5;
let acPlayerSpeed = 0.5;

let camSensitivity = 150;
let acCamSensitivity = 150;
let enchancedMovement = false; // TODO: step the player in steps to prevent going to fast and clipping and lagging out.

// Graphical Elements. (Minimap/Maze Solver)
let fog = true;
let minimap = true;
let iLikeCheating = false;
let fogIntensity = 1.5;

// Winning Position.
let winPosX = 100;
let winPosY = 100;

// Camera Rotation.
let playerCam = 15;

// Field Of View
const fov = 76;

// Resolution
const lod = 1200;

// Ray Precission
const rayLod = 16; 

// Game FPS
let fps = 60;

// Texture X width

const width = 80;

// Fun

let backroomsMode = true;

// Won?

let won = false;

// Calculating Minimap Size
let mapSize2 = Math.round((5/(Math.max(worldSizeX,worldSizeY)/50)));

let furthest = 0;

// Runs the flood search to find optimal path.

let floodedMaze = floodMaze();
alert(furthest);

// Const FPS
let previousTime = Date.now();
let curFPS;
let acFps = 0;
let totalFPS = 0;
let ticks = 0;
let avgFPS = 0;

// Enemies!

// posX, posY

enemyList = [];
let placeholderSize = 150;

findPlayerAndEndSpawn();
createEnemy([winPosX,winPosY], 1, 0.3); // Creates a dummy enemy.

// Canvas

const canvast = document.getElementById("gameWin"); // Get Canvas
document.body.style.background = "black";
const ctx = canvast.getContext("2d");

// Keypress detection.

let keysPressed = {};

document.addEventListener('keydown', (event) => {
    keysPressed[event.key] = true;
});

document.addEventListener('keyup', (event) => {
    delete keysPressed[event.key];
});
function isKeyHeldDown(key) {
    return keysPressed[key] === true;
}

// Main gameloop

function gameLoop() {
    setTimeout(function () {
        handleFPS();
        handleMovement();
        calRays();
        gameLoop();
        enemyMove();
        if(Math.sqrt((winPosX-playerPosX)*(winPosX-playerPosX)+(winPosY-playerPosY)*(winPosY-playerPosY))<0.5) {
            if(won==false) {
                alert("You win!");
                won=true;
            }
            location.reload();
        }
    }, 1000/fps);
}

// FPS monitering

function handleFPS() {
    acFps = (1000/(Date.now()-previousTime));
    totalFPS+=acFps;
    ticks++;
    avgFPS = Math.round(totalFPS/ticks);

    previousTime = Date.now();
}

// Raycast the map

function calRays() {
    rayVal = [];
    texturePositions = [];
    for(let x = 0; x < lod; x++) {
        let rayDir = playerCam-(fov/2)+(fov/lod*x);
        let rayRe = calRay(playerPosX,playerPosY,rayDir);
        rayVal.push(rayRe[0]);
        texturePositions.push(rayRe[1]);
    }
    drawData(rayVal, texturePositions);
}

// Shooting the ray, and calculating the distance travled.

function calRay(x, y, dir) {
    let col = false;
    let cycle = 0;
    let ra = convert(dir); 
    let xvel = Math.cos(ra);
    let yvel = Math.sin(ra);
    let posX = x;
    let posY = y;

    let texturePos = 0;

    let rayDistance;

    while (!col || cycle > 30*rayLod) {
        if (checkForCol(posX, posY)) {
            col = true;
        }
        else {
            posX += xvel / (2 * rayLod);
            posY += yvel / (2 * rayLod);
        }   
        if (checkForCol(posX, posY)) {
            col = true;
        }
        cycle++;  
    }
    cycle = 0;
    while (col || cycle > 30*rayLod) {
        if (!checkForCol(posX, posY)) {
            col = false;
        }
        else {
            let check = 0;
            posX += -xvel / (8 * rayLod);
            if (checkForCol(posX, posY)) {
                texturePos = hitLoc([posX,posY],0);
                check = 1;
            }
            posY += -yvel / (8 * rayLod);
            if (checkForCol(posX, posY) || check==0) {
                texturePos = hitLoc([posX,posY],1);
            }
        }
        cycle++;
    }


    
    rayDistance = Math.sqrt(Math.pow(posX-playerPosX,2)+Math.pow(posY-playerPosY,2));

    // Fix fisheye effect.
    rayDistance = rayDistance*Math.cos(convert(dir-playerCam));
    return [rayDistance,Math.round(texturePos*width)];
}

// Calculating position of hit for images.

function hitLoc(pos, x) {
    let val = 0;
    if(x==0) {
        val = pos[0]-Math.floor(pos[0]);
    }
    else if(x==1){
        val = pos[1]-Math.floor(pos[1]);
    }
    return Math.abs(val);
}

// Converting to radien

function convert(val) {
    return (Math.PI / 180)*val;
}

// Check if a point collided with the walls

function checkForCol(x,y) {
    try {
        if(world[Math.floor(y)][Math.floor(x)] == "1") {
            return true;
        }
    }
    catch {
        return true;
    }
    return false;
}

// Render the world

function drawData(data, texturePos) {
    ctx.clearRect(0, 0, canvast.width, canvast.height); // Clear from previous.

    let mapFullSizeX = mapSize2*worldSizeX;

    if(backroomsMode) {
        ctx.fillStyle = "rgb(166,138,55)";
        ctx.fillRect(0,0,canvast.width,canvast.height/2)
        ctx.fillStyle = "rgb(154,133,42)";
        ctx.fillRect(0,canvast.height/2,canvast.width,canvast.height/2)
    }

    sortedData = sortList(data, texturePos);
    data = sortedData[0]; texturePos = sortedData[1];
    let positionOfRays = sortedData[2];

    for(let x = data.length; x > 0; x--) { // Loop through al rays.
        if(data[x] == 0) { // Prevents rays that have not travled from dividing by 0, causing a glitchy look when looking at walls.
            data[x] = 0.001;
        }
        if(fog && !backroomsMode) {
            ctx.globalAlpha = Math.min(Math.max(0,2*fogIntensity-data[x]),1); // fog!!!!!
        }
        else {
            ctx.globalAlpha = 1;
        }
        let img = document.getElementById("texture");
        if(backroomsMode) {
            img = document.getElementById("backrooms");
        }
        ctx.drawImage(img, Math.min(width-1,texturePos[x]), 0, canvast.width/lod, 64, (positionOfRays[x]*(canvast.width/lod)), canvast.height/2-(300/data[x])/2, canvast.width/lod, 300/data[x]);
        //ctx.fillRect((x*(canvast.width/lod)), canvast.height/2-(300/data[x])/2, canvast.width/lod, 300/data[x]); // Draws the line.
        if(x-1 != -1) {
            checkForEnemy(data[x], data[x-1]);
        }
        else {
            checkForEnemy(data[x], 0.000001);
        }
    }
    if(iLikeCheating && minimap) { // Renders the solution to the maze
        for(let x = 0; x < result.length; x++) {
            ctx.fillStyle = "green";
            ctx.globalAlpha = 1;
            ctx.fillRect(mapFullSizeX-(result[x][1]*mapSize2),(result[x][0]*mapSize2),mapSize2,mapSize2);
        }
    }
    if(minimap) { // Renders the minimap
        ctx.fillStyle="white";
        ctx.globalAlpha = 1;
        for(let y = 0; y < world.length; y++) {
            for(let x = 0; x < world[y].length; x++) {
                if(world[y][x] == "1") {
                    ctx.fillRect(mapFullSizeX-(y*mapSize2),(x*mapSize2),mapSize2,mapSize2);
                }
            }
        }
        ctx.globalAlpha = 1;
        ctx.fillStyle="red"; // Renders the player.
        ctx.fillRect(mapFullSizeX-((playerPosY*mapSize2)-mapSize2/2),((playerPosX*mapSize2)-mapSize2/2),mapSize2,mapSize2);
        ctx.fillStyle="blue"; // Renders the end goal.
        ctx.fillRect(mapFullSizeX-((winPosY*mapSize2)-mapSize2/2),((winPosX*mapSize2)-mapSize2/2),mapSize2,mapSize2);

        ctx.fillStyle="black";
        ctx.font = "12px serif";
        ctx.fillText("FPS: "+Math.round(acFps), mapSize2, mapSize2*worldSizeY+24);
        ctx.fillText("AVG: "+avgFPS, mapSize2, mapSize2*worldSizeY+48);
    }
}

function makeArray(length) {
    vals = [];

    for(let x = 0; x<length; x++) {
        vals.push(x);
    }
    return vals;
}

function sortList(vals, texturePos) {
    sorted = false;

    positionsOfRays = makeArray(vals.length)

    while(!sorted) {
        sorted=true;
        for(let x = 0; x < vals.length; x++) {
            if(x!=vals.length-1) {
                if(vals[x]>vals[x+1]) {
                    cur = vals[x];
                    vals[x]=vals[x+1];
                    vals[x+1] = cur;

                    cur2 = texturePos[x];
                    texturePos[x] = texturePos[x+1];
                    texturePos[x+1] = cur2;

                    cur3 = positionsOfRays[x];
                    positionsOfRays[x] = positionsOfRays[x+1];
                    positionsOfRays[x+1] = cur3;

                    sorted=false;
                }
            }
        }
    }

    return [vals,texturePos, positionsOfRays];
}


// Handle inputs.

function handleMovement() {
    if(isKeyHeldDown("ArrowRight") || isKeyHeldDown("d")) {
        playerCam+=acCamSensitivity/fps;  
        fixCam(); 
    }
    if(isKeyHeldDown("ArrowLeft") || isKeyHeldDown("a")) {
        playerCam-=acCamSensitivity/fps;   
        fixCam();
    }
    if(isKeyHeldDown("ArrowUp") ||isKeyHeldDown("w")) {
        let ra = convert(playerCam);
        let xvel = Math.cos(ra) * 5 / fps * acPlayerSpeed;
        let yvel = Math.sin(ra) * 5 / fps * acPlayerSpeed;
        playerPosX+=xvel;
        stopColusionX();
        playerPosY+=yvel;
        stopColusionY();
    }
    if(isKeyHeldDown("ArrowDown") || isKeyHeldDown("s")) {
        let ra = convert(playerCam);
        let xvel = Math.cos(ra) * -5 / fps * acPlayerSpeed;
        let yvel = Math.sin(ra) * -5 / fps * acPlayerSpeed;
        playerPosX+=xvel;
        stopColusionBackX();
        playerPosY+=yvel;
        stopColusionBackY();
    }
    if(isKeyHeldDown("x")) {
        mapSize2=Math.round((5/(Math.max(worldSizeX,worldSizeY)/50)))*2.5;
    }
    else {
        mapSize2=Math.round((5/(Math.max(worldSizeX,worldSizeY)/50)));
    }
    if(isKeyHeldDown("m")) {
        iLikeCheating=true;
    }
    else {
        iLikeCheating=false;
    }
    if(isKeyHeldDown("q")) {
        acPlayerSpeed=playerSpeed*2; // Sprint
        acCamSensitivity = camSensitivity*2;
    }
    else {
        acPlayerSpeed=playerSpeed;
        acCamSensitivity = camSensitivity;
    }
}

function fixCam() {
    while(playerCam>=360) {
        playerCam-=360;
    }
    while(playerCam<-360) {
        playerCam+=360;
    }
    if(playerCam<0) {
        playerCam = 360 - Math.abs(playerCam);
    }
}

// When running into walls, moves the player back so they aren't in the wall.

function stopColusionX() {
    while(checkPlayerTouchingWall()) {
        playerPosX+=Math.cos(convert(playerCam)) * -0.01;
    }
}
function stopColusionY() {
    while(checkPlayerTouchingWall()) {
        playerPosY+=Math.sin(convert(playerCam)) * -0.01;
    }
}
function stopColusionBackX() {
    while(checkPlayerTouchingWall()) {
        playerPosX-=Math.cos(convert(playerCam)) * -0.01;
    }
}
function stopColusionBackY() {
    while(checkPlayerTouchingWall()) {
        playerPosY-=Math.sin(convert(playerCam)) * -0.01;
    }
}

// Checks if the player hit the wall.

function checkPlayerTouchingWall() {
    try {
        if(world[Math.floor(playerPosY)][Math.floor(playerPosX)] == "1") {
            return true;
        }
    }
    catch {
        return true;
    }
    return false;
}

// Checks if a point is touching the wall.

function checkPosTouchingWall(x,y) {
    try {
        if(world[Math.floor(x)][Math.floor(y)] == "1") {
            return true;
        }
    }
    catch {
        return true;
    }
    return false;
}

// Generates a empty list to eventually do flood search with.

function genList() {
    fullWorld = [];
    for(let x = 0; x < world[0].length; x++) {
        fullWorld.push(1);
        row = [];
        for(let x = 0; x < world.length; x++) {
            row.push(999999);
        }
        fullWorld[x]=row;
    }
    return fullWorld;
}

// "Floods" the maze, marks the distance of a given point from the begining of a maze.

function floodMaze() {
    let searchPos = [[1,1,1]];
    let fillSearch = genList();
    

    for(let x = 0; x < searchPos.length; x++) {
        if(checkLoc(searchPos[x])) {
            if (fillSearch[searchPos[x][0]][searchPos[x][1]] > searchPos[x][2]) {
                if(searchPos[x][2] != 999999 || furthest < searchPos[x][2]) {
                    furthest = searchPos[x][2];
                    winPosX = searchPos[x][1]+0.5;
                    winPosY = searchPos[x][0]+0.5;
                } 
                fillSearch[searchPos[x][0]][searchPos[x][1]] = searchPos[x][2];
                searchPos.push([searchPos[x][0]+1,searchPos[x][1],fillSearch[searchPos[x][0]][searchPos[x][1]]+1]);
                searchPos.push([searchPos[x][0],searchPos[x][1]+1,fillSearch[searchPos[x][0]][searchPos[x][1]]+1]);
                searchPos.push([searchPos[x][0]-1,searchPos[x][1],fillSearch[searchPos[x][0]][searchPos[x][1]]+1]);
                searchPos.push([searchPos[x][0],searchPos[x][1]-1,fillSearch[searchPos[x][0]][searchPos[x][1]]+1]);
            }
        }
    }
    return fillSearch;
}

// Creates the optimal path from the begining to the end.

function searchBackwards(floodArray) {
    let curPosX = winPosX-0.5;
    let curPosY = winPosY-0.5;
    let solveMovements = []; 

    let movements = [[1,0], [-1,0], [0,1], [0,-1]];
    let cycle = 0;

    while(cycle<99) {
        for(let x = 0; x < movements.length; x++) {
            try {
                if(floodArray[curPosY][curPosX] > floodArray[curPosY+movements[x][1]][curPosX+movements[x][0]]) {
                    solveMovements.push([curPosX+movements[x][0],curPosY+movements[x][1]]);
                    curPosX+=movements[x][0];
                    curPosY+=movements[x][1];
                    console.log([curPosX,curPosY, floodArray[curPosX][curPosY]]);
                    cycle = 0;
                }
            }
            catch {

            }
            cycle++;
        }
    }

    return solveMovements;
}

// Checks if a location is a valid location and not in a wall.

function checkLoc(pos) {
    if(0 > pos[0] || pos[0] > world.length-1) { return false; } // Remove invalid X pos
    if(0 > pos[1] || pos[1] > world.length-1) { return false; } // Remove invalid Y pos
    if(world[pos[0]][pos[1]] == "1") {return false; }

    return true;
}

// Finds the best location for the player/end spawn.
function findPlayerAndEndSpawn() {
    /*while(checkPosTouchingWall(winPosX,winPosY)) {
        winPosX=Math.round(Math.random()*5)+worldSizeX-6;
        winPosY=Math.round(Math.random()*5)+worldSizeY-6;
     }
     winPosX+=0.5;
     winPosY+=0.5; */
     playerPosX=1.5;
     playerPosY=1.5;
}

// Creates a enemy
function createEnemy(loc, type, spd) {
    enemyList.push([loc[0], loc[1], type, spd]);
}

// Enemy render
function checkForEnemy(curDis,nextDis) {
    for(let x = 0; x < enemyList.length; x++) {
        let relativeDir = 180-(Math.abs(180/Math.PI)*Math.atan2(playerPosY-enemyList[0][1],playerPosX-enemyList[0][0]))-(360-playerCam);
        let disToPlayer = Math.sqrt(Math.pow(playerPosX-enemyList[x][0],2)+Math.pow(playerPosY-enemyList[x][1],2));
        if(Math.abs(relativeDir) <= fov/2) {
            if(disToPlayer < curDis) {
                let playerSprite = document.getElementById("yes");
                let size = (1/disToPlayer)*placeholderSize;
                let xLoc = ((canvast.width/fov)*-relativeDir)+(canvast.width/2);
                ctx.fillStyle="black";
                //ctx.globalAlpha = Math.min(Math.max(0,2*fogIntensity-disToPlayer),1);
                ctx.drawImage(playerSprite,xLoc-size/2, (canvast.height/2)-(size/2), size,size);
            }
            else {
                
            }
        }
    }
}

// Enemy Move

function enemyMove() {
    /*
    for(let x = 0; x < enemyList.length; x++) {
        let enemyDir = (Math.abs(180/Math.PI)*Math.atan2(playerPosY-enemyList[0][1],playerPosX-enemyList[0][0]));

        enemyList[x][0] += Math.cos(enemyDir) * -5 / fps * enemyList[x][3];
        enemyList[x][1] += Math.sin(enemyDir) * -5 / fps * enemyList[x][3];
    } */
}

function stopEnemyHitWallX(x, xvel) {
    while(checkPosTouchingWall(enemyList[x][0],enemyList[x][1])) {
        enemyList[x][0]+=xvel*-0.1;
    }
}
function stopEnemyHitWallY(x, yvel) {
    while(checkPosTouchingWall(enemyList[x][0],enemyList[x][1])) {
        enemyList[x][0]+=yvel*-0.1;
    }
}



// CHAT GPT CODE FOR MAZE GEN

function generateMaze(width, height) {
    // Initialize maze with walls (1)
    let maze = Array(height).fill(0).map(() => Array(width).fill(1));

    // Directions: up, down, left, right
    const directions = [
        [-2, 0],  // up
        [2, 0],   // down
        [0, -2],  // left
        [0, 2]    // right
    ];

    // Function to shuffle an array
    function shuffle(arr) {
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
    }

    // Recursive function to carve paths
    function carve(x, y) {
        maze[y][x] = 0;  // Set the current position as an open path (0)

        shuffle(directions);  // Randomize the direction order

        for (let [dy, dx] of directions) {
            const nx = x + dx;
            const ny = y + dy;

            // Check if the next cell is within bounds and if it's still a wall
            if (nx > 0 && nx < width - 1 && ny > 0 && ny < height - 1 && maze[ny][nx] === 1) {
                // Carve a path between the current cell and the next cell
                maze[y + dy / 2][x + dx / 2] = 0;
                carve(nx, ny);  // Recursively carve from the next cell
            }
        }
    }

    // Start carving from position (1, 1)
    carve(1, 1);

    return maze;
}

// Makes win route.
let result = searchBackwards(floodedMaze);

// Starts the game.
gameLoop();