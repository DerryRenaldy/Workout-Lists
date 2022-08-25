'use strict';

// ============================== PARENT CLASS ==============================
class Workout {
  date = new Date();
  // Unique id generated when new workout created
  id = (Date.now() + '').slice(-10);

  constructor(coords, distance, duration) {
    this.coords = coords; // Array for coordinate = [lat, lng]
    this.distance = distance; // data distance
    this.duration = duration; // data duration
  }

  _setDescription() {
    // prettier-ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    // prettier-ignore
    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${months[this.date.getMonth()]} ${this.date.getDate()}`;
  }
}

// ============================== CHILD CLASS ==============================

// ========== RUNNING WORKOUT CLASS ==========
class Running extends Workout {
  type = 'running';

  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    this.calcPace();
    this._setDescription();
  }

  // Define in m/s
  calcPace() {
    this.pace = this.distance / this.duration;
    return this.pace;
  }
}

// ========== CYCLING WORKOUT CLASS ==========
class Cycling extends Workout {
  type = 'cycling';

  constructor(coords, distance, duration, elevationGain) {
    super(coords, distance, duration);
    this.elevationGain = elevationGain;
    this.calcSpeed();
    this._setDescription();
  }

  // Define in km/h
  calcSpeed() {
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}

// =================================================================
// =====================APPLICATION ARCHITECTURE ===================
// =================================================================

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');

class App {
  // private Variable
  #map;
  #mapZoomLevel = 13;
  #mapEvent;
  #workouts = [];

  constructor() {
    // Get User's Position
    this._getPosition();

    // Get Data From Local Storage
    this._getLocalStorage();

    // Attach Event Handlers
    form.addEventListener('submit', this._newWorkout.bind(this)); // Create new workout
    inputType.addEventListener('change', this._toggleElevationField); // Toggle input field (hidden / show)
    containerWorkouts.addEventListener('click', this._moveToPopup.bind(this)); // Move map view to choosen workout lists
  }

  // ==================== METHODS ====================

  // METHOD GET POSITION
  _getPosition() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        // On success callback
        this._loadMap.bind(this),

        // On failur callback
        function () {
          alert('Could not get your position');
        }
      );
    }
  }

  // METHOD LOAD MAP
  _loadMap(position) {
    const { latitude } = position.coords;
    const { longitude } = position.coords;

    const coords = [latitude, longitude];

    // Map Initialization
    this.#map = L.map('map').setView(coords, this.#mapZoomLevel);

    // Map style configuration
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    // Map starting popup marker (when first load map)
    L.marker(coords).addTo(this.#map).bindPopup('You Are Here!!').openPopup();

    // Map clicks handler
    this.#map.on('click', this._showForm.bind(this));

    // Render popup marker from data in local storage (should rendered after map finish loaded)
    this.#workouts.forEach(data => {
      this._renderWorkoutMarker(data);
    });
  }

  // METHOD SHOW FORM
  _showForm(mapE) {
    this.#mapEvent = mapE;
    form.classList.remove('hidden');
    inputDistance.focus();
  }

  // METHOD HIDE FORM
  _hideForm() {
    // prettier-ignore
    inputDistance.value = inputCadence.value = inputDuration.value = inputElevation.value = ''

    form.style.display = 'none';
    form.classList.add('hidden');
    setTimeout(() => (form.style.display = 'grid'), 1000);
  }

  // METHOD TOGGLE CADENCE / ELEVATION
  _toggleElevationField() {
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
  }

  // METHOD ADDING NEW WORKOUT TO LIST
  _newWorkout(e) {
    // Prevent browser from refreshing because of submitting
    e.preventDefault();

    // Input validation
    const validInputs = (...inputs) =>
      inputs.every(inp => Number.isFinite(inp));
    const allPositive = (...inputs) => inputs.every(inp => inp > 0);

    // Get data from the new workout form
    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    const { lat, lng } = this.#mapEvent.latlng; //position coordinates from point in map we clicked
    let workout;

    // If activity type is 'running', create running object in workout variable
    if (type === 'running') {
      const cadence = +inputCadence.value;
      // Check if data is valid
      if (
        !validInputs(distance, duration, cadence) ||
        !allPositive(distance, duration, cadence)
      )
        return alert('Input is not valid!');

      workout = new Running([lat, lng], distance, duration, cadence);
    }

    // If activity type is 'running', create running object in workout variable
    if (type === 'cycling') {
      const elevation = +inputElevation.value;

      // Check if data is valid
      if (
        !validInputs(distance, duration, elevation) ||
        !allPositive(distance, duration)
      )
        return alert('Input is not valid!');

      workout = new Cycling([lat, lng], distance, duration, elevation);
    }

    // Add new object to workouts array
    this.#workouts.push(workout);

    // Render workout on map as marker
    this._renderWorkoutMarker(workout);

    // Render workout on list
    this._rendeWorkout(workout);

    // Clear input fields
    this._hideForm();

    //Set local storage to all workouts
    this._setLocalStorage();
  }

  // METHOD RENDERING WORKOUT MARKER
  _renderWorkoutMarker(workout) {
    L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(
        `${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♂️'} ${workout.description}`
      )
      .openPopup();
  }

  // METHOD RENDER WORKOUT TO LISTS
  _rendeWorkout(workout) {
    let html = `
        <li class="workout workout--${workout.type}" data-id="${workout.id}">
          <h2 class="workout__title">${workout.description}</h2>
          <div class="workout__details">
            <span class="workout__icon">${
              workout.type === 'running' ? '🏃‍♂️' : '🚴‍♂️'
            }</span>
            <span class="workout__value">${workout.distance}</span>
            <span class="workout__unit">km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⏱</span>
            <span class="workout__value">${workout.duration}</span>
            <span class="workout__unit">min</span>
          </div>
    `;

    if (workout.type === 'running')
      html += `
          <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.pace.toFixed(1)}</span>
            <span class="workout__unit">m/h</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">🦶🏼</span>
            <span class="workout__value">${workout.cadence}</span>
            <span class="workout__unit">spm</span>
          </div>
        </li>
    `;

    if (workout.type === 'cycling')
      html += `
          <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.speed.toFixed(1)}</span>
            <span class="workout__unit">km/h</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⛰</span>
            <span class="workout__value">${workout.elevationGain}</span>
            <span class="workout__unit">m</span>
          </div>
        </li>
    `;

    form.insertAdjacentHTML('afterend', html);
  }

  // METHOD MOVE TO MARKER SELECTED WORKOUT LIST
  _moveToPopup(e) {
    const workoutEl = e.target.closest('.workout');

    if (!workoutEl) return;

    const workout = this.#workouts.find(
      work => work.id === workoutEl.dataset.id
    );

    this.#map.setView(workout.coords, this.#mapZoomLevel, {
      animate: true,
      pan: {
        duration: 1,
      },
    });
  }

  // METHOD TO SET LOCAL STORAGE
  _setLocalStorage() {
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  }

  // METHOD TO GET LOCAL STORAGE DATA
  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem('workouts'));

    if (!data) return;

    this.#workouts = data;

    this.#workouts.forEach(data => {
      this._rendeWorkout(data);
    });
  }

  // METHOD TO RESET DATA TO EMPTY
  reset() {
    localStorage.removeItem('workouts');
    location.reload();
  }
}

// NEW APP OBJECT
const app = new App();
