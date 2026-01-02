/**
 * Draggable Navigation Menu
 * Makes sidebar navigation items draggable and saves order to localStorage
 */

document.addEventListener('DOMContentLoaded', () => {
    const navList = document.querySelector('nav ul');
    const logoutItem = document.querySelector('.logout-item');
    const storageKey = 'navMenuOrder';

    if (!navList) return;

    // Load saved order
    loadNavOrder();

    // Initialize jQuery UI Sortable
    initSortable();

    function loadNavOrder() {
        const savedOrder = localStorage.getItem(storageKey);
        if (!savedOrder) return;

        try {
            const order = JSON.parse(savedOrder);
            const items = Array.from(navList.querySelectorAll('li:not(.logout-item)'));
            const itemMap = {};

            items.forEach((item) => {
                const navId = item.querySelector('a')?.id;
                if (navId) {
                    itemMap[navId] = item;
                }
            });

            // Only reorder if we have valid mappings for all saved items
            const validOrder = order.filter(navId => itemMap[navId]);
            
            if (validOrder.length === items.length) {
                items.forEach(item => item.remove());
                
                validOrder.forEach(navId => {
                    if (itemMap[navId] && logoutItem) {
                        navList.insertBefore(itemMap[navId], logoutItem);
                    }
                });
            }
        } catch (e) {
            console.error('Error loading nav order:', e);
            // Clear bad data
            localStorage.removeItem(storageKey);
        }
    }

    function initSortable() {
        $(navList).sortable({
            items: 'li:not(.logout-item)',
            placeholder: 'nav-placeholder',
            tolerance: 'pointer',
            cursor: 'grab',
            update: saveNavOrder
        });

        $(navList).disableSelection();
    }

    function saveNavOrder() {
        const items = Array.from(navList.querySelectorAll('li:not(.logout-item)'));
        const order = items.map(item => {
            return item.querySelector('a')?.id || '';
        }).filter(id => id);

        if (order.length > 0) {
            localStorage.setItem(storageKey, JSON.stringify(order));
        }
    }
});
