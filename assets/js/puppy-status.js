document.addEventListener('DOMContentLoaded', function () {
  fetch('/data/puppies.json?' + Date.now()) // cache-buster
    .then(function (response) {
      return response.json();
    })
    .then(function (puppies) {
      if (!Array.isArray(puppies)) return;

      puppies.forEach(function (p) {
        if (p.status !== 'reserved') return;

        // Find the reserve button for this puppy
        var selector = '.reserve-btn[data-puppy-id="' + p.id + '"]';
        var btn = document.querySelector(selector);
        if (!btn) return;

        var span = document.createElement('span');
        span.className = 'button disabled';
        span.textContent = 'Reserved';

        btn.parentNode.replaceChild(span, btn);
      });
    })
    .catch(function (err) {
      console.error('Error loading puppy status', err);
    });
});
