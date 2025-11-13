// Basic scripts for small enhancements
document.addEventListener("DOMContentLoaded", function(){
  // mobile nav toggle (if you add a .nav-toggle element)
  const toggle = document.querySelector('.nav-toggle');
  if(toggle){
    toggle.addEventListener('click', function(){
      document.querySelector('.nav-list').classList.toggle('open');
    });
  }
});
