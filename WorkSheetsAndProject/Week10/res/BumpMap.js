function initNormalMapTexture() {
    tex = gl.createTexture();
    var image = new Image();
    image.onload = function() {
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);

        // Set texture parameters
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.generateMipmap(gl.TEXTURE_2D);
    };
    image.src = TEXTUREPATH+"brick_256x256.png";
    return tex;
}

function SetBumpIntensity(document) {
    // Set initial bumpIntensity
    gl.uniform1f(bumpIntensityLocation, 0.5);

    // Slider element
    const slider = document.getElementById("bump-slider");
    const bumpValueDisplay = document.getElementById("bump-value");

    // Update shader uniform on slider change
    slider.addEventListener("input", (event) => {
        const bumpIntensity = parseFloat(event.target.value);
        bumpValueDisplay.textContent = bumpIntensity.toFixed(2); // Update displayed value
        gl.uniform1f(bumpIntensityLocation, bumpIntensity); // Update shader uniform
    });
}