//************* UTILITIES **************/
/**
 * General async function to handle data fetching
 * @param {string} url
 * @returns {string || Error}
 */
function fetchData(url) {
  return new Promise(function (resolve, reject) {

    fetch(url)
      .then(response => response.json())
      .then(data => resolve(data))
      .catch(error => reject(error));

  });
}


// Rounding function https://gist.github.com/djD-REK/2e347f5532bb22310daf450f03ec6ad8 
function roundOne(n, d) {
  Math.round(n * Math.pow(10, d)) / Math.pow(10, d)
}


//************* ACTION **************/
window.addEventListener('load', () => getData() );


window.addEventListener('change', e => {

  if (e.target.closest('[data-control]')) {
    let dataset = e.target.dataset.control;
    let value = e.target.valueAsNumber;

    /** SESSION STORAGE - set new value */
    console.log(dataset, value);
    sessionStorage.setItem(dataset, value);
    getData();
  }
});


//************* MAIN **************/
/**
 * Called on load and update - gets data from server
 * @returns {void}
 */
async function getData(){
  console.log(`getData........`);
  const SECTIONS = `https://bovisync.bitbucket.io/sample_data/page_meta.json`;
  const ITEMS = `https://bovisync.bitbucket.io/sample_data/item_meta.json`;
  const ANIMAL = `https://bovisync.bitbucket.io/sample_data/animal_data.json`;

  let sections = fetchData(SECTIONS);
  let items = fetchData(ITEMS);
  let animal = fetchData(ANIMAL);

  /*
   * Resolve all API call promises and update DOM 
   */
  Promise.all([sections, items, animal])
    .then(values => {
      let sectionsData = values[0].sections;
      let itemsData = values[1];
      let animalData = values[2];

      //TODO error check on array
      updateSections(sectionsData, itemsData, animalData);

    })
    //TODO DOM error message here
    .catch(error => {
      console.error(error.message);
    });
}


/**
 * Update DOM
 * @param {{label:string, items: string[]}} sectionsData 
 * @param {{dataType:"Integer"|"String"|"Decimal", description:string, name:string, shortName:string}} itemsData
 * @returns {void}
 */
function updateSections(sectionsData, itemsData, animalData) {

  /**
   * CONTROLS - Filter for just numberic 
   */
  let numericControls = itemsData.filter(item => {
    
    if(item.dataType === 'Integer' || item.dataType === 'Decimal'){
      //could come from JSON and combined with itemsData
      let thresholdAll = 101;
      let precision = 2;

      /* SESSION STORAGE - Add threshold to session storage for each numeric item */
      //set the thresholds
      if (!sessionStorage.getItem(item.shortName)) {
        sessionStorage.setItem(item.shortName, thresholdAll); 
      }

      //set the precision
      if(item.dataType === 'Decimal'){

        if (!sessionStorage.getItem(`precision-${item.shortName}`)) {
          sessionStorage.setItem(`precision-${item.shortName}`, precision);
        }
      }

      return item;
    }
  
  });

  document.querySelector('#controls').innerHTML = makeControls(numericControls);


  /**
   * SECTIONS - Iterate each section...
   */
  let newSections = sectionsData.map((section, index) => {
    let { label, items } = section;

    let itemMeta = items.map(item => {
      let match = itemsData.find(element => element.shortName === item);
      // console.log(match);

      return match;
    });
    // console.log(itemMeta);
    
    // page meta may contain up to 10 sections of data
    if (index <= 9) {

      return makePanel({
        label,
        items: itemMeta,
        animal: animalData
      });

    }

  }).join('');

  document.querySelector('#sections').innerHTML = newSections;
}


//************* DOM METHODS **************/
/**
 * DOM CONTROLS - 
 */
function makeControls(numericControls) {
  
  return `
  <nav class="panel">
    <p class="panel-heading">Controls</p>
    <div class="control">

    ${numericControls.map(control => {
      console.log(`control`, control);
      /**@type {number} */
      let storage = sessionStorage.getItem(control.shortName);

      return`
      
        ${control.dataType === 'Decimal' ? 
        makeDecimalControl(control, storage) : `
        <div class="panel-block">
          <span style="min-width: 200px;">${control.name}</span>
          <input class="input" type="number" data-control="${control.shortName}" value="${storage}">
        </div>
        `}
      
      `;

    }).join('')}
    
    </div>
  </nav>
  `;
}


/**
 * Called from makeControls - creates subcomponent
 */
function makeDecimalControl(control, storage){
  /**@type {number} */
  let precision = sessionStorage.getItem(`precision-${control.shortName}`);
  console.log(`precision: ${precision}`);

  //sessionStorage.setItem(`precision-${item.shortName}`, 2);
  return `
  <div class="panel-block">
    <span style="min-width: 200px;">${control.name}</span>
    <input class="input" type="number" data-control="${control.shortName}" value="${storage}">
    <span style="min-width: 100px; margin-left: .5em">Precision</span>
    <input class="input" type="number" data-control="precision-${control.shortName}" value="${precision}">
  </div>
  `;
}


/**
 * DOM SECTIONS - Creates Panels 
 */
function makePanel({ items, label, animal }) {

  return `
  <nav class="panel">
    <p class="panel-heading">
      ${label}
    </p>
    
    ${items.map((item, index) => {
      // must exist and up to 10 report items within each section.
      if (item && index <= 9 ){

        /**@type {number} */
        let storage = sessionStorage.getItem(item.shortName);
        // console.log(`storage: `, storage);

        /**@type {boolean} */
        let exceedStyle = storage && animal[item.shortName] > storage ? true : false;

        /**@type {number} */
        let precision = item.dataType === 'Decimal' ? sessionStorage.getItem(`precision-${item.shortName}`) : false;
        // console.log(`precision in panel: ${precision}`);

        // if there is a value, not false, round it to precision.
        let numericValue = precision ? roundOne(animal[item.shortName], precision) : animal[item.shortName];

        return`
        <div class="panel-block ${exceedStyle ? ` has-text-info has-text-weight-bold` : ``}" style="justify-content: space-between;">
          <a class="panel-block" data-dataType="${item.dataType}" data-description="${item.description}" data-shortName="${item.shortName}" title="${item.shortName} - ${item.description}">
          ${item.name}
          </a>
          
            ${numericValue ?
              `<span style="padding-right: .5em;">${numericValue}</span>` 
              : ``}
          
        </div>
        `;
      }
      
    }).join('')}

  </nav>
  `;
}