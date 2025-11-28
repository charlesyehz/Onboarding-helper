const REGION_STORAGE_KEY = "selected-region";
const DEFAULT_REGION = "AU";

export function initRegionSelector() {
  const regionBtn = document.getElementById("region-btn");
  const regionDropdown = document.getElementById("region-dropdown");
  const currentRegionSpan = document.getElementById("current-region");
  const regionOptions = document.querySelectorAll(".region-option");

  // Load saved region
  const savedRegion = localStorage.getItem(REGION_STORAGE_KEY) || DEFAULT_REGION;
  currentRegionSpan.textContent = savedRegion;

  // Toggle dropdown
  regionBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    const isVisible = regionDropdown.style.display === "block";
    regionDropdown.style.display = isVisible ? "none" : "block";
  });

  // Select region
  regionOptions.forEach((option) => {
    option.addEventListener("click", (e) => {
      const selectedRegion = e.target.dataset.region;
      currentRegionSpan.textContent = selectedRegion;
      localStorage.setItem(REGION_STORAGE_KEY, selectedRegion);
      regionDropdown.style.display = "none";

      // Dispatch custom event for other components to react to region change
      window.dispatchEvent(
        new CustomEvent("regionChanged", { detail: { region: selectedRegion } })
      );
    });
  });

  // Close dropdown when clicking outside
  document.addEventListener("click", (e) => {
    if (!regionBtn.contains(e.target) && !regionDropdown.contains(e.target)) {
      regionDropdown.style.display = "none";
    }
  });
}

export function getSelectedRegion() {
  return localStorage.getItem(REGION_STORAGE_KEY) || DEFAULT_REGION;
}
