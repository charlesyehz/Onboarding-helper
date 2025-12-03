import { getSelectedRegion, saveSelectedRegion } from "../../shared/storage.js";

const DEFAULT_REGION = "AU";
const REGION_FLAGS = {
  AU: "🇦🇺",
  UK: "🇬🇧",
};
const FALLBACK_FLAG = "🌍";

export async function initRegionSelector(preloadedRegion = null) {
  const regionBtn = document.getElementById("region-btn");
  const regionDropdown = document.getElementById("region-dropdown");
  const currentRegionSpan = document.getElementById("current-region");
  const currentRegionFlag = document.getElementById("current-region-flag");
  const regionOptions = document.querySelectorAll(".region-option");

  // Use preloaded region or load from storage
  const savedRegion = preloadedRegion || (await getSelectedRegion());
  setCurrentRegionDisplay(savedRegion);

  // Toggle dropdown
  regionBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    const isVisible = regionDropdown.style.display === "block";
    regionDropdown.style.display = isVisible ? "none" : "block";
  });

  // Select region
  regionOptions.forEach((option) => {
    option.addEventListener("click", async () => {
      const selectedRegion = option.dataset.region;
      if (!selectedRegion) {
        return;
      }
      setCurrentRegionDisplay(selectedRegion);
      await saveSelectedRegion(selectedRegion);
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
