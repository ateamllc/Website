(function () {
  const fallbackOffers = {
    HANGER100: {
      label: 'HANGER100: $100 off first >$500 job',
      detail: 'HANGER100: $100 off first >$500 job',
      terms: 'New customers only. Project total must exceed $500 before discount. One per household. Cannot be combined with other offers.'
    }
  };
  window.ATeamDiscountOffers = fallbackOffers;

  const loadOffers = async () => {
    try {
      const response = await fetch('/data/offers/discount-codes.json', { headers: { 'Accept': 'application/json' } });
      if (!response.ok) throw new Error(`Discount code data request failed: ${response.status}`);
      return await response.json();
    } catch (error) {
      console.warn('Using fallback discount code data', error);
      return fallbackOffers;
    }
  };

  const setOfferFields = (form, offers, code) => {
    const detail = form.querySelector('input[name="offer_detail"]');
    const terms = form.querySelector('input[name="offer_terms"]');
    const offer = offers[code] || { detail: '', terms: '' };
    if (detail) detail.value = offer.detail || '';
    if (terms) terms.value = offer.terms || '';
  };

  const populateDiscountSelect = (select, offers) => {
    const selectedValue = select.value;
    select.querySelectorAll('option[data-discount-option="true"]').forEach((option) => option.remove());

    Object.entries(offers).forEach(([code, offer]) => {
      const option = document.createElement('option');
      option.value = code;
      option.textContent = offer.label || code;
      option.dataset.discountOption = 'true';
      select.appendChild(option);
    });

    if (selectedValue && offers[selectedValue]) {
      select.value = selectedValue;
    }
  };

  document.addEventListener('DOMContentLoaded', async function () {
    const forms = document.querySelectorAll('[data-discount-codes]');
    if (!forms.length) return;

    const offers = await loadOffers();
    window.ATeamDiscountOffers = offers;

    forms.forEach((form) => {
      const select = form.querySelector('select[name="discount_code"]');
      const field = form.querySelector('input[name="discount_code"]');

      if (select) {
        populateDiscountSelect(select, offers);
        const syncSelect = () => setOfferFields(form, offers, select.value);
        select.addEventListener('change', syncSelect);
        syncSelect();
        return;
      }

      if (field) {
        setOfferFields(form, offers, field.value);
      }
    });
  });
}());
