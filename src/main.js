// main.js

// REGISTRAZIONE DEL SERVICE WORKER
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js')
        .then(reg => console.log("Service Worker registrato", reg))
        .catch(err => console.error("Errore nella registrazione del Service Worker", err));
    });
  }
  
  let inscriptions = [];
  let filteredData = [];
  let currentPage = 1;
  const pageSize = 20;
  let activeFilters = {};
  
  const filtersContainer = document.getElementById('filters');
  const container = document.getElementById('container');
  const searchInput = document.getElementById('search');
  const shuffleBtn = document.getElementById('shuffle');
  const removeFiltersBtn = document.getElementById('removeFilters');
  const toggleFiltersBtn = document.getElementById('toggle-filters');
  const filtersContainerDiv = document.getElementById('filters-container');
  const activeFiltersContainer = document.getElementById('activeFiltersContainer');
  
  // Elementi del modal
  const detailsModal = document.getElementById('detailsModal');
  const modalTitle = document.getElementById('modalTitle');
  const modalIframe = document.getElementById('modalIframe');
  const modalLink = document.getElementById('modalLink');
  const modalDetails = document.getElementById('modalDetails');
  const modalClose = document.getElementById('modalClose');
  
  // Observer per lazy loading degli iframe
  const observer = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const iframe = entry.target;
        iframe.src = iframe.getAttribute('data-src');
        observer.unobserve(iframe);
      }
    });
  });
  
  function createCard(item) {
    if (!item.id) {
      console.error("Item senza id:", item);
      return document.createElement('div');
    }
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <a href="squiddies.html?id=${item.id}" target="_blank">
        <div class="preview">
          <iframe data-src="squiddies.html?id=${item.id}" title="Contenuto Squiddies" loading="lazy"></iframe>
        </div>
      </a>
      <div class="card-id">
        <button class="details-btn">Details</button>
      </div>
    `;
    const detailsBtn = card.querySelector('.details-btn');
    detailsBtn.addEventListener('click', () => showDetails(item));
    observer.observe(card.querySelector('iframe'));
    return card;
  }
  
  function showDetails(item) {
    modalTitle.textContent = item.id;
    modalIframe.setAttribute('data-src', `squiddies.html?id=${item.id}`);
    modalIframe.src = `squiddies.html?id=${item.id}`;
    modalLink.onclick = () => window.open(`https://ordinals.com/inscription/${item.id}`, '_blank');
    modalDetails.innerHTML = '';
    
    if (item.meta && item.meta.attributes) {
      item.meta.attributes.forEach(attr => {
        const div = document.createElement('div');
        div.className = 'metadata-item';
        div.innerHTML = `
          <h3>${attr.trait_type}</h3>
          <p>${attr.value}</p>
        `;
        const p = div.querySelector('p');
        p.style.cursor = 'pointer';
        p.addEventListener('click', () => {
          activeFilters[attr.trait_type] = new Set([attr.value]);
          updateDisplay();
          updateActiveFiltersDisplay();
          updateFilterCheckboxes();
          const detailsElem = document.querySelector(`details.filter-group[data-trait="${attr.trait_type}"]`);
          if (detailsElem) detailsElem.open = true;
          detailsModal.style.display = 'none';
        });
        modalDetails.appendChild(div);
      });
    }
    detailsModal.style.display = 'block';
  }
  
  modalClose.addEventListener('click', () => {
    detailsModal.style.display = 'none';
  });
  
  window.addEventListener('click', (event) => {
    if (event.target === detailsModal) {
      detailsModal.style.display = 'none';
    }
  });
  
  function buildFilters() {
    const filterOptions = {};
    inscriptions.forEach(inscription => {
      if (inscription.meta && inscription.meta.attributes) {
        inscription.meta.attributes.forEach(attr => {
          if (!filterOptions[attr.trait_type]) {
            filterOptions[attr.trait_type] = new Set();
          }
          filterOptions[attr.trait_type].add(attr.value);
        });
      }
    });
    for (const trait in filterOptions) {
      filterOptions[trait] = Array.from(filterOptions[trait]).sort();
    }
    let filtersHTML = '';
    for (const trait in filterOptions) {
      filtersHTML += `<details class="filter-group" data-trait="${trait}">
                        <summary>${trait}</summary>`;
      filterOptions[trait].forEach(value => {
        const inputId = trait.replace(/\s+/g, '_') + '_' + value;
        filtersHTML += `<label for="${inputId}">
                          <input type="checkbox" id="${inputId}" class="filter-checkbox" data-trait="${trait}" data-value="${value}">
                          ${value}
                        </label>`;
      });
      filtersHTML += `</details>`;
    }
    filtersContainer.innerHTML = filtersHTML;
  
    document.querySelectorAll('.filter-checkbox').forEach(checkbox => {
      checkbox.addEventListener('change', () => {
        const trait = checkbox.getAttribute('data-trait');
        const value = checkbox.getAttribute('data-value');
        if (!activeFilters[trait]) activeFilters[trait] = new Set();
        if (checkbox.checked) {
          activeFilters[trait].add(value);
        } else {
          activeFilters[trait].delete(value);
          if (activeFilters[trait].size === 0) delete activeFilters[trait];
        }
        updateDisplay();
        updateActiveFiltersDisplay();
      });
    });
  }
  
  function updateFilterCheckboxes() {
    document.querySelectorAll('.filter-checkbox').forEach(checkbox => {
      const trait = checkbox.getAttribute('data-trait');
      const value = checkbox.getAttribute('data-value');
      checkbox.checked = activeFilters[trait] && activeFilters[trait].has(value);
    });
  }
  
  function updateActiveFiltersDisplay() {
    activeFiltersContainer.innerHTML = '';
    Object.keys(activeFilters).forEach(trait => {
      activeFilters[trait].forEach(value => {
        const chip = document.createElement('button');
        chip.className = 'active-filter-chip';
        chip.textContent = `${trait}: ${value} ✕`;
        chip.addEventListener('click', () => {
          activeFilters[trait].delete(value);
          if (activeFilters[trait].size === 0) delete activeFilters[trait];
          updateDisplay();
          updateActiveFiltersDisplay();
          updateFilterCheckboxes();
        });
        activeFiltersContainer.appendChild(chip);
      });
    });
  }
  
  function updateDisplay() {
    filteredData = inscriptions.filter(item => {
      for (const trait in activeFilters) {
        const values = activeFilters[trait];
        if (!item.meta || !item.meta.attributes) return false;
        const match = item.meta.attributes.some(attr => attr.trait_type === trait && values.has(attr.value));
        if (!match) return false;
      }
      return true;
    });
    const searchQuery = searchInput.value.trim().toLowerCase();
    if (searchQuery !== "") {
      filteredData = filteredData.filter(item => item.id.toLowerCase().includes(searchQuery));
    }
    updateActiveFiltersDisplay();
    updateFilterCheckboxes();
    currentPage = 1;
    renderPage(currentPage);
  }
  
  function renderPage(page) {
    container.innerHTML = "";
    const startIndex = (page - 1) * pageSize;
    const pageData = filteredData.slice(startIndex, startIndex + pageSize);
    const fragment = document.createDocumentFragment();
    pageData.forEach(item => {
      fragment.appendChild(createCard(item));
    });
    container.appendChild(fragment);
    currentPage = page;
    renderPaginationControls();
  }
  
  function renderPaginationControls() {
    let paginationContainer = document.getElementById('pagination');
    if (!paginationContainer) {
      paginationContainer = document.createElement('div');
      paginationContainer.id = 'pagination';
      document.querySelector('.window-content').appendChild(paginationContainer);
    }
    paginationContainer.innerHTML = "";
    const totalPages = Math.ceil(filteredData.length / pageSize);
    if (totalPages <= 1) return;
    
    const prevButton = document.createElement('button');
    prevButton.textContent = 'Prev';
    prevButton.disabled = currentPage === 1;
    prevButton.addEventListener('click', () => {
      if (currentPage > 1) renderPage(currentPage - 1);
    });
    paginationContainer.appendChild(prevButton);
    
    const pageInfo = document.createElement('span');
    pageInfo.id = 'pageInfo';
    pageInfo.textContent = ` Page ${currentPage} of ${totalPages} `;
    paginationContainer.appendChild(pageInfo);
    
    const nextButton = document.createElement('button');
    nextButton.textContent = 'Next';
    nextButton.disabled = currentPage === totalPages;
    nextButton.addEventListener('click', () => {
      if (currentPage < totalPages) renderPage(currentPage + 1);
    });
    paginationContainer.appendChild(nextButton);
  }
  
  shuffleBtn.addEventListener('click', () => {
    shuffleArray(inscriptions);
    updateDisplay();
  });
  
  function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }
  
  removeFiltersBtn.addEventListener('click', () => {
    document.querySelectorAll('.filter-checkbox').forEach(checkbox => {
      checkbox.checked = false;
    });
    activeFilters = {};
    updateDisplay();
  });
  
  toggleFiltersBtn.addEventListener('click', () => {
    if (filtersContainerDiv.style.display === 'none' || filtersContainerDiv.style.display === '') {
      filtersContainerDiv.style.display = 'block';
      toggleFiltersBtn.textContent = 'Hide Filters';
    } else {
      filtersContainerDiv.style.display = 'none';
      toggleFiltersBtn.textContent = 'Show Filters';
    }
  });
  
  function debounce(func, delay) {
    let timeout;
    return function(...args) {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), delay);
    };
  }
  searchInput.addEventListener('input', debounce(updateDisplay, 300));
  
  async function loadData() {
    try {
      let ids, metadataMapping;
      const storedIds = localStorage.getItem('ids');
      const storedMetadata = localStorage.getItem('metadataMapping');
  
      if (storedIds && storedMetadata) {
        ids = JSON.parse(storedIds);
        metadataMapping = JSON.parse(storedMetadata);
        console.log("Dati JSON caricati dal localStorage");
      } else {
        const idsResponse = await fetch('/src/data/ids.json');
        ids = await idsResponse.json();
        const metadataResponse = await fetch('/src/data/metadata.json');
        metadataMapping = await metadataResponse.json();
        localStorage.setItem('ids', JSON.stringify(ids));
        localStorage.setItem('metadataMapping', JSON.stringify(metadataMapping));
        console.log("Dati JSON fetchati e salvati nel localStorage");
      }
  
      inscriptions = ids.map(id => {
        const inscription = { id };
        if (metadataMapping[id]) {
          inscription.meta = metadataMapping[id];
        }
        return inscription;
      });
  
      // Mescola per avere elementi random
      shuffleArray(inscriptions);
      buildFilters();
      updateDisplay();
    } catch (error) {
      console.error('Errore durante il caricamento dei dati:', error);
    }
  }
  
  loadData();
  