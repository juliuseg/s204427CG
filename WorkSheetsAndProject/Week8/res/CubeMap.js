
function initCubeMapTexture() {
    let tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, tex);

    // List of images for each face of the cube map, in the correct order
    const cubemapImages = generateCubemapImages(TEXTUREPATH+"/cubemaps/brightday2_cubemap/brightday2")
    // = [
    //     { target: gl.TEXTURE_CUBE_MAP_POSITIVE_X, src: TEXTUREPATH+'cm_left.png' },
    //     { target: gl.TEXTURE_CUBE_MAP_NEGATIVE_X, src: TEXTUREPATH+'cm_right.png' },
    //     { target: gl.TEXTURE_CUBE_MAP_POSITIVE_Y, src: TEXTUREPATH+'cm_top.png' },
    //     { target: gl.TEXTURE_CUBE_MAP_NEGATIVE_Y, src: TEXTUREPATH+'cm_bottom.png' },
    //     { target: gl.TEXTURE_CUBE_MAP_POSITIVE_Z, src: TEXTUREPATH+'cm_back.png' },
    //     { target: gl.TEXTURE_CUBE_MAP_NEGATIVE_Z, src: TEXTUREPATH+'cm_front.png' }
    // ];

    let loadedImages = 0;

    cubemapImages.forEach((face, i) => {
        const image = new Image();
        image.crossOrigin = 'anonymous'; // For loading images from a different domain, if needed
        image.onload = function() {
            //gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true); // Flip the image vertically on load
            gl.bindTexture(gl.TEXTURE_CUBE_MAP, tex);
            gl.texImage2D(face.target, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);

            loadedImages++;
            if (loadedImages === 6) { // When all 6 images are loaded
                gl.generateMipmap(gl.TEXTURE_CUBE_MAP);
                gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
                gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
                gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
                gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
                gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_R, gl.CLAMP_TO_EDGE); // Wrap for Z-axis
            }
        };
        image.src = face.src;
    });
    return tex;
}


function initBackgroundQuad() {
    // Changes since last: Added vertices for background quad and buffer setup
    var vertices = [
        vec4(-1, -1, 0.999, 1),
        vec4(1, -1, 0.999, 1),
        vec4(1, 1, 0.999, 1),
        vec4(-1, 1, 0.999, 1)
    ];

    backgroundIndex = vertices.length;

    var vBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(vertices), gl.STATIC_DRAW);

    var vPosition = gl.getAttribLocation(gl.getParameter(gl.CURRENT_PROGRAM), "vPosition");
    gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);

    gl.backgroundBuffer = vBuffer; // Save the background buffer for re-binding
}

function generateCubemapImages(basePath) {
    const cubemapImages = [
        { target: gl.TEXTURE_CUBE_MAP_POSITIVE_X, src: `${basePath}_posx.png` },
        { target: gl.TEXTURE_CUBE_MAP_NEGATIVE_X, src: `${basePath}_negx.png` },
        { target: gl.TEXTURE_CUBE_MAP_POSITIVE_Y, src: `${basePath}_posy.png` },
        { target: gl.TEXTURE_CUBE_MAP_NEGATIVE_Y, src: `${basePath}_negy.png` },
        { target: gl.TEXTURE_CUBE_MAP_POSITIVE_Z, src: `${basePath}_posz.png` },
        { target: gl.TEXTURE_CUBE_MAP_NEGATIVE_Z, src: `${basePath}_negz.png` },
    ];
    return cubemapImages;
}