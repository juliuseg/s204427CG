const handlers = {
    orbit: {
        onMouseDown: handleOrbitMouseDown,
        onMouseMove: handleOrbitMouseMove,
        onMouseUp: handleOrbitMouseUp,
    },
    dolly: {
        onMouseDown: handleDollyMouseDown,
        onMouseMove: handleDollyMouseMove,
        onMouseUp: handleDollyMouseUp,
    },
    pan: {
        onMouseDown: handlePanMouseDown,
        onMouseMove: handlePanMouseMove,
        onMouseUp: handlePanMouseUp,
    },
    spin: {
        onMouseDown: handleSpinMouseDown,
        onMouseMove: handleSpinMouseMove,
        onMouseUp: handleSpinMouseUp,
    }


};

const sharedState = {
    dragging: false,
    lastPos: null,
    currentQuat: new Quaternion(),
    lastIncrementalQuat: new Quaternion(), // Store last rotation
    spinActive: false,                     // Track if spinning
    lastMouseMoveTime: 0,                  // Track time of last movement
    cameraSettings: {
        look: [0, 0, 0],      // Look-at point
        distance: 5.0,        // Distance from look-at point (dolly)
        panOffset: [0, 0, 0]     // Panning offset (x, y)
    }
};


///// ORBIT /////


function handleOrbitMouseDown(ev, state) {
    state.dragging = true;
    state.lastPos = getArcballVector(ev.clientX, ev.clientY, canvas);
}

function handleOrbitMouseMove(ev, state) {
    if (state.dragging) {
        const currPos = getArcballVector(ev.clientX, ev.clientY, canvas);
        if (state.lastPos && currPos) {
            const q = new Quaternion();
            q.make_rot_vec2vec(state.lastPos, currPos);
            state.currentQuat.set(q.multiply(state.currentQuat));
        }
        state.lastPos = currPos;
    }
}

function handleOrbitMouseUp(ev, state) {
    state.dragging = false;
    state.lastPos = null;
}

///// Spin /////
function handleSpinMouseDown(ev, state) {
    state.dragging = true;
    state.lastPos = getArcballVector(ev.clientX, ev.clientY, canvas);
    state.lastIncrementalQuat = new Quaternion();
    state.spinActive = false; // Stop spinning on new interaction
}

function handleSpinMouseMove(ev, state) {
    if (state.dragging) {
        const currPos = getArcballVector(ev.clientX, ev.clientY, canvas);

        if (state.lastPos && currPos) {
            const q = new Quaternion();
            q.make_rot_vec2vec(state.lastPos, currPos);
            state.currentQuat.multiply(q);
            state.lastIncrementalQuat = q; // Save incremental rotation
            const qe = q.elements;
        }
        state.lastPos = currPos;
        state.lastMouseMoveTime = performance.now();
    }
}

function handleSpinMouseUp(ev, state) {
    state.dragging = false;

    // Check if mouse stopped at the same position or after timeout
    if (performance.now() - state.lastMouseMoveTime > 20) {
        state.lastIncrementalQuat = new Quaternion(); // Reset
        state.spinActive = false;
    } else {
        state.spinActive = true; // Continue spinning
    }
    state.lastPos = null;
}


///// DOLLY /////


function handleDollyMouseDown(ev, state) {
    state.dragging = true;
    state.lastPos = ev.clientY;
}

function handleDollyMouseMove(ev, state) {
    if (state.dragging) {
        const deltaY = ev.clientY - state.lastPos;
        state.cameraSettings.distance = Math.max(0.1, state.cameraSettings.distance + deltaY * 0.01);
        state.lastPos = ev.clientY;
    }
}

function handleDollyMouseUp(ev, state) {
    state.dragging = false;
    state.lastPos = null;
}


///// PANNING /////
// Debug-friendly pan functions
function handlePanMouseDown(ev, state) {
    state.dragging = true;
    state.lastPos = [ev.clientX, ev.clientY];
}

function handlePanMouseMove(ev, state) {
    if (state.dragging) {
        const deltaX = ev.clientX - state.lastPos[0];
        const deltaY = ev.clientY - state.lastPos[1];

        const { currentQuat, cameraSettings } = state;

        // Look vector
        const lookVector = [0, 0, -1];
        const rotatedLookVector = currentQuat.apply(lookVector);

        // Up vector
        const upVector = [0, 1, 0];
        const rotatedUpVector = currentQuat.apply(upVector);

        // Right vector
        const rightVector = cross(rotatedLookVector, rotatedUpVector);
        const normalizedRight = normalize(rightVector);

        // Recompute up vector to ensure it's orthogonal
        const normalizedUp = normalize(cross(normalizedRight, rotatedLookVector));

        // Calculate pan offset
        const panSpeed = 0.005;
        const panDelta = [
            -deltaX * panSpeed * normalizedRight[0] + deltaY * panSpeed * normalizedUp[0],
            -deltaX * panSpeed * normalizedRight[1] + deltaY * panSpeed * normalizedUp[1],
            -deltaX * panSpeed * normalizedRight[2] + deltaY * panSpeed * normalizedUp[2],
        ];

        // Apply pan offset
        cameraSettings.panOffset[0] += panDelta[0];
        cameraSettings.panOffset[1] += panDelta[1];
        cameraSettings.panOffset[2] += panDelta[2];

        // Update last position
        state.lastPos = [ev.clientX, ev.clientY];
    }
}

function handlePanMouseUp(ev, state) {
    state.dragging = false;
    state.lastPos = null;
}
