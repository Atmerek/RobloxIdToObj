# Roblox ID to .obj

This script takes a specific Roblox user ID and downloads model files for that user from Roblox CDN servers.

## How to run

1. Clone the project
```bash
  git clone https://github.com/Atmerek/RobloxIdToObj
```
2. Go to the project directory
```bash
  cd RobloxIdToObj
```
3. Install dependencies
```bash
  npm install
```
4. Run the script
```bash
  node index.js <userId>
```
5. You're done. The .obj model can be imported to eg. Blender. Textures will be automatically assigned from the .mtl file.
