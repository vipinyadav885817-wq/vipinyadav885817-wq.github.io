const menuToggle = document.getElementById("menuToggle");
const primaryNav = document.getElementById("primaryNav");
const filterButtons = document.querySelectorAll(".filter-chip");
const courseCards = document.querySelectorAll(".course-card");
const emptyFilter = document.getElementById("emptyFilter");
const yearLabel = document.getElementById("currentYear");

if (yearLabel) {
    yearLabel.textContent = new Date().getFullYear();
}

if (menuToggle && primaryNav) {
    menuToggle.addEventListener("click", function() {
        const isOpen = primaryNav.classList.toggle("open");
        menuToggle.setAttribute("aria-expanded", String(isOpen));
        menuToggle.setAttribute("aria-label", isOpen ? "Close navigation" : "Open navigation");
    });

    primaryNav.addEventListener("click", function(event) {
        if (event.target.closest("a")) {
            primaryNav.classList.remove("open");
            menuToggle.setAttribute("aria-expanded", "false");
            menuToggle.setAttribute("aria-label", "Open navigation");
        }
    });
}

filterButtons.forEach(function(button) {
    button.addEventListener("click", function() {
        const selectedFilter = button.dataset.filter;
        let visibleCount = 0;

        filterButtons.forEach(function(filterButton) {
            const isSelected = filterButton === button;
            filterButton.classList.toggle("active", isSelected);
            filterButton.setAttribute("aria-pressed", String(isSelected));
        });

        courseCards.forEach(function(card) {
            const isVisible = selectedFilter === "all" || card.dataset.category === selectedFilter;
            card.hidden = !isVisible;
            if (isVisible) visibleCount += 1;
        });

        if (emptyFilter) emptyFilter.hidden = visibleCount > 0;
    });
});

