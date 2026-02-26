// categories.js — Category management (standard + custom)

export const DEFAULT_CATEGORIES = [
  { id: 'hardware',        name: 'Hardware & Geräte',          icon: '💻', taxRelevant: true  },
  { id: 'software',        name: 'Software & Lizenzen',        icon: '📀', taxRelevant: true  },
  { id: 'internet_phone',  name: 'Internet & Telefon',         icon: '📡', taxRelevant: true  },
  { id: 'office_supplies', name: 'Büromaterial',               icon: '📎', taxRelevant: true  },
  { id: 'travel',          name: 'Reise & Fahrtkosten',        icon: '🚗', taxRelevant: true  },
  { id: 'meals_business',  name: 'Bewirtung (geschäftlich)',   icon: '🍽️', taxRelevant: true  },
  { id: 'education',       name: 'Fortbildung & Kurse',        icon: '📚', taxRelevant: true  },
  { id: 'marketing',       name: 'Marketing & Werbung',        icon: '📣', taxRelevant: true  },
  { id: 'insurance',       name: 'Versicherungen (beruflich)', icon: '🛡️', taxRelevant: true  },
  { id: 'accounting',      name: 'Steuer & Buchhaltung',       icon: '🧾', taxRelevant: true  },
  { id: 'home_office',     name: 'Homeoffice',                 icon: '🏠', taxRelevant: true  },
  { id: 'other_business',  name: 'Sonstige Betriebsausgaben',  icon: '📋', taxRelevant: true  },
  { id: 'private',         name: 'Privat (nicht absetzbar)',   icon: '🏷️', taxRelevant: false },
];

export const AVAILABLE_ICONS = ['📌','🎯','💡','🔧','✏️','🖥️','📱','🎨','🎵','🌐','🏋️','🛒','🎁','💰','📈','🔑','🌱','🚀'];

export class CategoryService {
  constructor(storage) {
    this._storage = storage;
  }

  getAll() {
    const custom = this._storage.getCustomCategories();
    return [...DEFAULT_CATEGORIES, ...custom];
  }

  getById(id) {
    return this.getAll().find((c) => c.id === id) || null;
  }

  getRecent() {
    const ids = this._storage.getRecentCategoryIds();
    const all = this.getAll();
    return ids.map((id) => all.find((c) => c.id === id)).filter(Boolean);
  }

  search(query) {
    if (!query || !query.trim()) return this.getAll();
    const q = query.trim().toLowerCase();
    return this.getAll().filter((c) => c.name.toLowerCase().includes(q));
  }

  markUsed(id) {
    this._storage.addRecentCategoryId(id);
  }

  addCustom(name, icon = '📌') {
    const sanitized = this._sanitizeName(name);
    if (!sanitized) throw new Error('Kategoriename darf nicht leer sein');
    if (sanitized.length > 50) throw new Error('Kategoriename darf max. 50 Zeichen lang sein');

    const custom = this._storage.getCustomCategories();
    if (custom.length >= 20) throw new Error('Maximal 20 eigene Kategorien erlaubt');

    const duplicate = this.getAll().find((c) => c.name.toLowerCase() === sanitized.toLowerCase());
    if (duplicate) throw new Error('Eine Kategorie mit diesem Namen existiert bereits');

    const newCat = {
      id: `custom_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      name: sanitized,
      icon,
      taxRelevant: true,
      isCustom: true,
    };
    custom.push(newCat);
    this._storage.saveCustomCategories(custom);
    return newCat;
  }

  updateCustom(id, updates) {
    const custom = this._storage.getCustomCategories();
    const idx = custom.findIndex((c) => c.id === id);
    if (idx === -1) throw new Error('Kategorie nicht gefunden');

    if (updates.name) {
      updates.name = this._sanitizeName(updates.name).slice(0, 50);
    }
    custom[idx] = { ...custom[idx], ...updates, id, isCustom: true };
    this._storage.saveCustomCategories(custom);
    return custom[idx];
  }

  removeCustom(id, allExpenses) {
    const inUse = allExpenses.some((e) => e.categoryId === id);
    if (inUse) throw new Error('Kategorie wird noch von Ausgaben verwendet');
    const custom = this._storage.getCustomCategories().filter((c) => c.id !== id);
    this._storage.saveCustomCategories(custom);
  }

  // ─── Private ────────────────────────────────────────────

  _sanitizeName(name) {
    return String(name || '').replace(/[<>&"'/]/g, '').trim();
  }
}
