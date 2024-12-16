window.onload = function init()
{ 
   // Get the canvas element
   var canvas = document.getElementById("gl-canvas");

   // Initialize WebGL context
   var gl = WebGLUtils.setupWebGL(canvas);
   if (!gl) {
       alert("WebGL isn’t available");
       return;
   }

   // Set viewport and clear the canvas
   gl.viewport(0, 0, canvas.width, canvas.height);
   gl.clearColor(0.3921, 0.5843, 0.9294, 1.0); // Set background color to blue

   // Load shaders and initialize attribute buffers
   var program = initShaders(gl, "vertex-shader", "fragment-shader");
   gl.useProgram(program);

   // Define vertices for a triangle
   var vertices = new Float32Array([
       0.0, 0.0,  // Bottom-left vertex
        1.0, 0.0,  // Bottom-right vertex
        1.0,  1.0   // Top vertex
   ]);

   // Define colors for each vertex (red, green, blue)
   var colors = new Float32Array([
       1.0, 0.0, 0.0, 1.0,  // Red color for the bottom-left vertex
       0.0, 1.0, 0.0, 1.0,  // Green color for the bottom-right vertex
       0.0, 0.0, 1.0, 1.0   // Blue color for the top vertex
   ]);

   // Create a buffer for the vertex positions
   var vBuffer = gl.createBuffer();
   gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
   gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

   // Associate the vertex position attribute with the buffer
   var vPosition = gl.getAttribLocation(program, "vPosition");
   gl.vertexAttribPointer(vPosition, 2, gl.FLOAT, false, 0, 0);
   gl.enableVertexAttribArray(vPosition);

   // Create a buffer for the vertex colors
   var cBuffer = gl.createBuffer();
   gl.bindBuffer(gl.ARRAY_BUFFER, cBuffer);
   gl.bufferData(gl.ARRAY_BUFFER, colors, gl.STATIC_DRAW);

   // Associate the vertex color attribute with the buffer
   var vColor = gl.getAttribLocation(program, "vColor");
   gl.vertexAttribPointer(vColor, 4, gl.FLOAT, false, 0, 0); // 4 components per color (RGBA)
   gl.enableVertexAttribArray(vColor);

   // Clear the canvas and draw the triangle
   gl.clear(gl.COLOR_BUFFER_BIT);
   gl.drawArrays(gl.TRIANGLES, 0, 3); 
}

