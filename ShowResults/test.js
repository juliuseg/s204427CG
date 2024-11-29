// Function to fetch the number from number.txt
async function fetchImageCount() {
    try {
        const response = await fetch('number.txt');
        if (!response.ok) {
            throw new Error('Failed to fetch number.txt');
        }
        const text = await response.text();
        return parseInt(text.trim(), 10);
    } catch (error) {
        console.error('Error fetching number.txt:', error);
        return 0; // Default to 0 if the fetch fails
    }
}

// Function to initialize the slider
async function initializeSlider() {
    const slider = document.getElementById('slider');
    const sliderValue = document.getElementById('sliderValue');
    const image = document.getElementById('sliderImage');

    // Fetch the number of images
    const numberOfImages = await fetchImageCount();

    // Set the slider's maximum value based on the number of images
    slider.max = numberOfImages - 1;
    slider.value = 0; // Reset to the first image
    sliderValue.textContent = "Epoch" + slider.value; // Set initial slider value

    // Update the image source and slider value when the slider value changes
    slider.addEventListener('input', () => {
        const index = slider.value;
        image.src = `${index}.jpg`;
        image.alt = `Image ${index}`;
        sliderValue.textContent = index; // Update displayed slider value
    });

    // Set the initial image
    image.src = '0.jpg';
    image.alt = 'Image 0';
}

// Ensure DOM is loaded before initializing
document.addEventListener('DOMContentLoaded', () => {
    initializeSlider();
});
