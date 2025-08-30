// Scroll to features when "Learn More" clicked
document.getElementById("learnMoreBtn").addEventListener("click", () => {
    document.getElementById("features").scrollIntoView({ behavior: "smooth" });
});

// Handle contact form submission
document.getElementById("contactForm").addEventListener("submit", (e) => {
    e.preventDefault();
    document.getElementById("formMessage").classList.remove("hidden");
    e.target.reset();
});
