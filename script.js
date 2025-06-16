const API_KEY = 'AIzaSyDQg9iEd84bzwI7paYV6h5GUseg5_kcoi0';                                                                  //©Rajat
let nextPageToken = null;
let currentQuery = '';
let isFetching = false;

document.getElementById("search-button").addEventListener("click", () => {
  handleSearch();
});

document.getElementById("search-input").addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    handleSearch();
  }
});

function handleSearch() {
  const query = document.getElementById("search-input").value.trim();
  if (!query) return;

  currentQuery = query;
  nextPageToken = null; // reset token on new search
  document.getElementById("results-container").innerHTML = "";
  fetchVideos(query);
}

function fetchVideos(query, pageToken = '') {
  if (isFetching) return;
  isFetching = true;

  let url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&q=${encodeURIComponent(query)}&key=${API_KEY}&maxResults=10`;
  if (pageToken) url += `&pageToken=${pageToken}`;

  fetch(url)
    .then(res => res.json())
    .then(data => {
      nextPageToken = data.nextPageToken || null;
      const videos = data.items;

      if (!videos || videos.length === 0) {
        isFetching = false;
        return;
      }

      const videoIds = videos.map(v => v.id.videoId).join(",");

      // Fetch durations
      fetch(`https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id=${videoIds}&key=${API_KEY}`)
        .then(res => res.json())
        .then(durationData => {
          const durationMap = {};
          durationData.items.forEach(item => {
            durationMap[item.id] = item.contentDetails.duration;
          });

          showResultsWithDurations(videos, durationMap);
          isFetching = false;
        })
        .catch(err => {
          console.error("Error fetching video durations:", err);
          isFetching = false;
        });
    })
    .catch(err => {
      console.error("Error fetching YouTube search results:", err);
      isFetching = false;
    });
}

function showResultsWithDurations(videos, durationMap) {
  const container = document.getElementById("results-container");

  videos.forEach(video => {
    const videoId = video.id.videoId;
    const snippet = video.snippet;
    const title = snippet.title;
    const thumbnail = snippet.thumbnails.medium.url;
    const channel = snippet.channelTitle;
    const publishedAt = new Date(snippet.publishedAt).toLocaleDateString();
    const description = snippet.description;

    const durationISO = durationMap[videoId];
    const durationFormatted = durationISO ? formatDuration(durationISO) : "";

    // Determine if short (less than 60s)
    let isShort = false;
    if (durationISO) {
      const match = durationISO.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
      const hours = (match[1]) ? parseInt(match[1].replace("H", "")) : 0;
      const minutes = (match[2]) ? parseInt(match[2].replace("M", "")) : 0;
      const seconds = (match[3]) ? parseInt(match[3].replace("S", "")) : 0;
      const totalSeconds = hours * 3600 + minutes * 60 + seconds;
      isShort = totalSeconds < 60;
    }

    const item = document.createElement("a");
    item.className = "result-item";
    item.href = `player.html?videoId=${videoId}`;
    item.target = "_blank";

    const durationBadge = isShort
      ? `<span class="duration-badge">Shorts</span>`
      : `<span class="duration-badge">${durationFormatted}</span>`;

    item.innerHTML = `
      <div class="thumbnail-wrapper">
        <img src="${thumbnail}" alt="${title}">
        ${durationBadge}
      </div>
      <div class="result-info">
        <h4>${title}</h4>
        <p>${channel} • ${publishedAt}</p>
        <p>${description}</p>
      </div>
    `;

    container.appendChild(item);
  });
}

function formatDuration(isoDuration) {
  const match = isoDuration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);

  const hours = (match[1]) ? parseInt(match[1].replace("H", "")) : 0;
  const minutes = (match[2]) ? parseInt(match[2].replace("M", "")) : 0;
  const seconds = (match[3]) ? parseInt(match[3].replace("S", "")) : 0;

  const hDisplay = hours > 0 ? hours + ":" : "";
  const mDisplay = (hours > 0 && minutes < 10) ? "0" + minutes + ":" : minutes + ":";
  const sDisplay = (seconds < 10) ? "0" + seconds : seconds;

  return hDisplay + mDisplay + sDisplay;
}

// Infinite Scroll listener
window.addEventListener("scroll", () => {
  const nearBottom = window.innerHeight + window.scrollY >= document.body.offsetHeight - 100;

  if (nearBottom && nextPageToken && currentQuery && !isFetching) {
    fetchVideos(currentQuery, nextPageToken);
  }
});
