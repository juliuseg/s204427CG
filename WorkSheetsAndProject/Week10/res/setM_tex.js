function setM_texBackground(eyePos) {
    var projectionMatrix = perspective(90, canvas.width / canvas.height, 0.1, 100.0);
    var viewMatrix = lookAt(eyePos, vec3(0, 0, 0), vec3(0, 1, 0));
    
    var inverseProjectionMatrix = inverse(projectionMatrix);
    var viewRotationOnly = mat4(
        vec4(viewMatrix[0][0], viewMatrix[0][1], viewMatrix[0][2], 0),
        vec4(viewMatrix[1][0], viewMatrix[1][1], viewMatrix[1][2], 0),
        vec4(viewMatrix[2][0], viewMatrix[2][1], viewMatrix[2][2], 0),
        vec4(0, 0, 0, 1)
    );
    var inverseViewRotation = inverse(viewRotationOnly);
    
    var M_tex = mult(inverseViewRotation, inverseProjectionMatrix);
    gl.uniformMatrix4fv(M_texLoc, false, flatten(M_tex));
}

function setM_texSphere() {
    var M_tex = mat4(); 
    gl.uniformMatrix4fv(M_texLoc, false, flatten(M_tex));
}