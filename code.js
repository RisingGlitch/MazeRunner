// World size.
const worldSizeX = 201;
const worldSizeY = 201;

// Creating the world.
const world = generateMaze(worldSizeX, worldSizeY);

// Player details.
let playerPosX = 4;
let playerPosY = 4;

let playerSpeed = 0.5;
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
const fov = 80;

// Resolution
const lod = 1200;

// Ray Precission
const rayLod = 16; 

// Game FPS
let fps = 30;

// Texture X width

const width = 80;

// Fun

let backroomsMode = false;

// Won?

let won = false;

// Calculating Minimap Size
let mapSize2 = Math.round((5/(Math.max(worldSizeX,worldSizeY)/50)));

// Runs the flood search to find optimal path.

let floodedMaze = floodMaze();

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
        handleMovement();
        calRays();
        gameLoop();
        if(Math.sqrt((winPosX-playerPosX)*(winPosX-playerPosX)+(winPosY-playerPosY)*(winPosY-playerPosY))<1.5) {
            if(!won) {
                alert("You win!");
                won=true;
            }
            location.reload();
        }
    }, 1000/fps);
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
    canvast = document.getElementById("gameWin"); // Get Canvas
    document.body.style.background = "black";
    const ctx = canvast.getContext("2d");
    ctx.clearRect(0, 0, canvast.width, canvast.height); // Clear from previous.

    let mapFullSizeX = mapSize2*worldSizeX;

    if(backroomsMode) {
        ctx.fillStyle = "rgb(166,138,55)";
        ctx.fillRect(0,0,canvast.width,canvast.height/2)
        ctx.fillStyle = "rgb(154,133,42)";
        ctx.fillRect(0,canvast.height/2,canvast.width,canvast.height/2)
    }

    for(let x = 0; x < data.length; x++) { // Loop through al rays.
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
        ctx.drawImage(img, Math.min(width-1,texturePos[x]), 0, canvast.width/lod, 64, (x*(canvast.width/lod)), canvast.height/2-(300/data[x])/2, canvast.width/lod, 300/data[x]);
        //ctx.fillRect((x*(canvast.width/lod)), canvast.height/2-(300/data[x])/2, canvast.width/lod, 300/data[x]); // Draws the line.
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
        ctx.fillStyle="green"; // Renders the end goal.
        ctx.fillRect(mapFullSizeX-((winPosX*mapSize2)-mapSize2/2),((winPosY*mapSize2)-mapSize2/2),mapSize2,mapSize2);
    }
}

// Handle inputs.

function handleMovement() {
    if(isKeyHeldDown("ArrowRight") || isKeyHeldDown("d")) {
        playerCam+=150/fps;   
    }
    if(isKeyHeldDown("ArrowLeft") || isKeyHeldDown("a")) {
        playerCam-=150/fps;   
    }
    if(isKeyHeldDown("ArrowUp") ||isKeyHeldDown("w")) {
        let ra = convert(playerCam);
        let xvel = Math.cos(ra) * 5 / fps * playerSpeed;
        let yvel = Math.sin(ra) * 5 / fps * playerSpeed;
        playerPosX+=xvel;
        stopColusionX();
        playerPosY+=yvel;
        stopColusionY();
    }
    if(isKeyHeldDown("ArrowDown") || isKeyHeldDown("s")) {
        let ra = convert(playerCam);
        let xvel = Math.cos(ra) * -5 / fps * playerSpeed;
        let yvel = Math.sin(ra) * -5 / fps * playerSpeed;
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
    let curPosX = winPosX;
    let curPosY = winPosY;
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
        }``
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
    while(checkPosTouchingWall(winPosX,winPosY)) {
        winPosX=Math.round(Math.random()*5)+worldSizeX-6;
        winPosY=Math.round(Math.random()*5)+worldSizeY-6;
     }

     playerPosX=1.5;
     playerPosY=1.5;
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

findPlayerAndEndSpawn();

// Makes win route.
let result = searchBackwards(floodedMaze);

// Starts the game.
gameLoop();