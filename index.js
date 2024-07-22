const axios = require('axios');
const fs = require('fs');
const path = require('path');

async function fetchImageUrl(userId) {
    const response = await axios.get(`https://thumbnails.roblox.com/v1/users/avatar-3d?userId=${userId}`);
    return response.data.imageUrl;
}

async function fetchModelData(imageUrl) {
    const response = await axios.get(imageUrl);
    return response.data;
}

// Roblox has a weird CDN system...
function getUrl(hash) {
    let i = 31;
    for (let t = 0; t < 38; t++) {
        i ^= hash[t].charCodeAt(0);
    }
    return `https://t${(i % 8).toString()}.rbxcdn.com/${hash}`;
}

async function downloadFile(url, outputFilePath) {
    const response = await axios.get(url, { responseType: 'stream' });
    response.data.pipe(fs.createWriteStream(outputFilePath));
    return new Promise((resolve, reject) => {
        response.data.on('end', () => resolve());
        response.data.on('error', reject);
    });
}

// .mtl stuff
function updateMtlFile(mtlFilePath) {
    let mtlContent = fs.readFileSync(mtlFilePath, 'utf8');
    
    mtlContent = mtlContent.replace(/map_(Ka|Kd|d|Ns)\s+([^\s]+)/g, (match, p1, p2) => {
        const localTexturePath = path.join('textures', `${p2}.png`);
        return `map_${p1} ${localTexturePath}`;
    });

    fs.writeFileSync(mtlFilePath, mtlContent, 'utf8');
}

// Adjust the model's coordinates so that the pivot is at the lowest point
function adjustObj(objFilePath) {
    const lines = fs.readFileSync(objFilePath, 'utf8').split('\n');
    
    let minY = Infinity;

    lines.forEach(line => {
        const parts = line.split(' ');
        if (parts[0] === 'v') {
            const y = parseFloat(parts[2]);
            if (y < minY) minY = y;
        }
    });

    const offsetY = -minY;

    const adjustedLines = lines.map(line => {
        const parts = line.split(' ');
        if (parts[0] === 'v') {
            const x = parseFloat(parts[1]);
            const y = parseFloat(parts[2]) + offsetY;
            const z = parseFloat(parts[3]);
            return `v ${x} ${y} ${z}`;
        }
        return line;
    });

    fs.writeFileSync(objFilePath, adjustedLines.join('\n'), 'utf8');
}

async function main() {
    try {
        const userId = process.argv[2];
        if (!userId) {
            throw new Error("User ID is required. Usage: node index.js <userId>");
        }
        const imageUrl = await fetchImageUrl(userId);
        const modelData = await fetchModelData(imageUrl);

        const modelDir = path.join(__dirname, 'model');
        const texturesDir = path.join(modelDir, 'textures');
        if (!fs.existsSync(modelDir)) fs.mkdirSync(modelDir);
        if (!fs.existsSync(texturesDir)) fs.mkdirSync(texturesDir);

        // Download .obj
        const objUrl = getUrl(modelData.obj);
        const objFilePath = path.join(modelDir, 'model.obj');
        console.log(`Downloading model (.obj) from: ${objUrl}`);
        await downloadFile(objUrl, objFilePath);

        // Download .mtl
        const mtlUrl = getUrl(modelData.mtl);
        const mtlFilePath = path.join(modelDir, 'model.mtl');
        console.log(`Downloading model (.mtl) from: ${mtlUrl}`);
        await downloadFile(mtlUrl, mtlFilePath);

        // Download textures
        for (const textureHash of modelData.textures) {
            const textureUrl = getUrl(textureHash);
            const textureFilePath = path.join(texturesDir, `${textureHash}.png`);
            console.log(`Downloading texture from: ${textureUrl}`);
            await downloadFile(textureUrl, textureFilePath);
        }

        // Update the .mtl
        console.log(`Updating .mtl file to reference local textures.`);
        updateMtlFile(mtlFilePath);

        // Adjust pivot
        console.log(`Adjusting model coordinates to set the pivot at the lowest point.`);
        adjustObj(objFilePath);

        console.log(`Completed! You got your model.`);
    } catch (error) {
        console.error('Error:', error.message);
    }
}

main();
