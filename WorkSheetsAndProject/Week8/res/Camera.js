class Camera {
    constructor(height, radius, speed, lookAtCenter, lightFollowFactor) {
        this.height = height; // Height of the camera
        this.radius = radius; // Radius of the circular path
        this.speed = speed; // Speed of the camera
        this.lookAtCenter = lookAtCenter; // Center the camera looks at
        this.lightFollowFactor = lightFollowFactor; // Determines light position behavior
        this.time = 0; // Internal time for animation
        this.lastTimestamp = null; // Timestamp for calculating deltaTime
    }

    update(currentTimestamp) {
        if (!this.lastTimestamp) this.lastTimestamp = currentTimestamp;
        const deltaTime = (currentTimestamp - this.lastTimestamp) / 1000;
        this.lastTimestamp = currentTimestamp;

        // Update time for circular motion
        this.time += deltaTime * this.speed;
    }

    getCameraPosition() {
        // Camera moves in a circle around the center
        const x = Math.sin(this.time) * this.radius;
        const z = Math.cos(this.time) * this.radius;
        const y = this.height;
        return vec3(x, y, z);
    }

    getLightPosition() {
        const x = Math.sin(this.time*this.lightFollowFactor) * this.radius;
        const z = Math.cos(this.time*this.lightFollowFactor) * this.radius;
        const y = this.height;
        return vec3(x, y, z);
    }

    getMVPMatrix(canvasWidth, canvasHeight) {
        const eyePos = this.getCameraPosition();
        const projectionMatrix = perspective(90, canvasWidth / canvasHeight, 0.1, 100.0);
        const viewMatrix = lookAt(eyePos, this.lookAtCenter, vec3(0.0, 1.0, 0.0));
        return mult(projectionMatrix, viewMatrix);
    }
}