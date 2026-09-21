/* ES5 syntax for older television browsers. One media element: the radio. */
(function () {
  'use strict';
  var slides = window.GODO_SLIDES || [];
  var picture = document.getElementById('picture');
  var radio = document.getElementById('radio');
  var station = document.getElementById('station');
  var panel = document.getElementById('panel');
  var status = document.getElementById('status');
  var diagnostics = document.getElementById('diagnostics');
  var index = 0, nextImage = null, wanted = false, retry = null;
  var attempts = 0, generation = 0, lastProgress = 0, lastTime = -1;
  var lines = [], slideTimer = null;

  function log(text) {
    lines.push(new Date().toLocaleTimeString() + ' ' + text);
    if (lines.length > 12) { lines.shift(); }
    diagnostics.textContent = navigator.userAgent + '\nMP3: ' + radio.canPlayType('audio/mpeg') + '\n' + lines.join('\n');
  }
  function message(text) { status.textContent = text; log(text); }
  function imageError(text) {
    var el = document.getElementById('image-error');
    el.textContent = text; el.style.display = text ? 'block' : 'none';
  }
  function preload() {
    nextImage = new Image();
    nextImage.src = slides[(index + 1) % slides.length].src;
  }
  function advance() {
    var nextIndex = (index + 1) % slides.length;
    if (nextImage && nextImage.complete && nextImage.naturalWidth > 0) {
      index = nextIndex;
      picture.src = nextImage.src;
      imageError('');
      preload();
      slideTimer = setTimeout(advance, slides[index].ms);
    } else {
      // Retain the current picture if the next download failed or is slow.
      imageError('A következő kép betöltésére várunk. Ellenőrizd a kepek mappát és a hálózatot.');
      if (nextImage && nextImage.complete) { preload(); }
      slideTimer = setTimeout(advance, 2000);
    }
  }
  if (slides.length) {
    preload(); slideTimer = setTimeout(advance, slides[0].ms);
  } else {
    imageError('Hiányzik a slides.js fájl. A teljes tv-diavetites mappát töltsd fel.');
  }
  picture.onerror = function () { imageError('A kép nem található. Ellenőrizd a kepek mappát.'); };

  function showMenu() { panel.className = ''; }
  function cancelRetry() { if (retry) { clearTimeout(retry); retry = null; } }
  function failed(text) {
    if (!wanted || retry) { return; }
    showMenu();
    if (attempts >= 3) {
      wanted = false;
      radio.pause();
      message(text + ' Válassz másik rádiót, vagy nyomd meg az Indítást.');
      return;
    }
    attempts += 1;
    message(text + ' Újrapróbálás 5 másodperc múlva (' + attempts + '/3).');
    retry = setTimeout(function () { retry = null; connect(); }, 5000);
  }
  function connect() {
    cancelRetry();
    var token = ++generation;
    lastProgress = Date.now(); lastTime = -1;
    radio.src = station.value;
    radio.load();
    message('Kapcsolódás: ' + station.options[station.selectedIndex].text);
    try {
      var result = radio.play();
      if (result && result.then) {
        result.then(function () {}, function (error) {
          if (token !== generation || !wanted) { return; }
          if (error.name === 'NotAllowedError') {
            wanted = false; cancelRetry(); showMenu();
            message('A TV indítást kér: nyomd meg az Indítás gombot.');
          } else { failed('Nem indult el a rádió: ' + error.name); }
        });
      }
    } catch (error) { failed('Lejátszási hiba: ' + error.message); }
  }
  function start() {
    wanted = true; attempts = 0; connect();
  }
  document.getElementById('start').onclick = start;
  document.getElementById('stop').onclick = function () {
    wanted = false; generation += 1; cancelRetry(); radio.pause();
    radio.removeAttribute('src'); radio.load();
    message('A rádió leállítva. A képek tovább váltakoznak.');
  };
  station.onchange = function () {
    try { localStorage.setItem('godo-radio', station.value); } catch (ignore) {}
    if (wanted) { start(); }
  };
  radio.addEventListener('playing', function () {
    if (!wanted) { radio.pause(); return; }
    cancelRetry(); lastProgress = Date.now();
    message('Lejátszás: ' + station.options[station.selectedIndex].text);
  });
  radio.addEventListener('timeupdate', function () {
    if (radio.currentTime !== lastTime) {
      lastTime = radio.currentTime; lastProgress = Date.now();
      // Reset retries only after actual playback, not just a playing event.
      if (radio.currentTime > 10) { attempts = 0; }
    }
  });
  radio.addEventListener('error', function () {
    var code = radio.error ? radio.error.code : '?';
    failed('Rádióhiba (' + code + '): a cím, kapcsolat vagy formátum nem elérhető.');
  });
  radio.addEventListener('ended', function () { failed('A rádiókapcsolat lezárult.'); });
  radio.addEventListener('waiting', function () { if (wanted) { message('Rádió pufferelése…'); } });
  setInterval(function () {
    if (wanted && !retry && Date.now() - lastProgress > 25000) {
      failed('25 másodperce nem halad a rádiólejátszás.');
    }
  }, 5000);
  document.getElementById('hide').onclick = function () {
    panel.className = 'hidden'; document.getElementById('menu').focus();
  };
  document.getElementById('menu').onclick = function () {
    showMenu(); document.getElementById('start').focus();
  };
  document.getElementById('debug').onclick = function () {
    diagnostics.style.display = diagnostics.style.display === 'block' ? 'none' : 'block';
  };
  document.addEventListener('keydown', function (event) {
    if (event.keyCode === 27 || event.keyCode === 10009) { showMenu(); }
  });
  try {
    var saved = localStorage.getItem('godo-radio');
    for (var i = 0; i < station.options.length; i++) {
      if (station.options[i].value === saved) { station.selectedIndex = i; break; }
    }
  } catch (ignore) {}
  log('Oldal betöltve; képek: ' + slides.length);
  document.getElementById('start').focus();
}());
