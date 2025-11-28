const REGION_STORAGE_KEY = "selected-region";
const DEFAULT_REGION = "AU";
const REGION_FLAGS = {
  AU: "🇦🇺",
  UK: "🇬🇧",
};
const FALLBACK_FLAG = "🌍";

export function initRegionSelector() {
  const regionBtn = document.getElementById("region-btn");
  const regionDropdown = document.getElementById("region-dropdown");
  const currentRegionSpan = document.getElementById("current-region");
  const currentRegionFlag = document.getElementById("current-region-flag");
  const regionOptions = document.querySelectorAll(".region-option");

  // Load saved region
  const savedRegion = localStorage.getItem(REGION_STORAGE_KEY) || DEFAULT_REGION;
  setCurrentRegionDisplay(savedRegion);

  // Toggle dropdown
  regionBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    const isVisible = regionDropdown.style.display === "block";
    regionDropdown.style.display = isVisible ? "none" : "block";
  });

  // Select region
  regionOptions.forEach((option) => {
    option.addEventListener("click", () => {
      const selectedRegion = option.dataset.region;
      if (!selectedRegion) {
        return;
      }
      setCurrentRegionDisplay(selectedRegion);
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

  function setCurrentRegionDisplay(region) {
    currentRegionSpan.textContent = region;
    if (currentRegionFlag) {
      currentRegionFlag.textContent = REGION_FLAGS[region] || FALLBACK_FLAG;
    }
  }
}

export function getSelectedRegion() {
  return localStorage.getItem(REGION_STORAGE_KEY) || DEFAULT_REGION;
}
