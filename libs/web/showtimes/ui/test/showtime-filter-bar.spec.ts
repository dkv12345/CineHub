import { describe, expect, it, vi } from 'vitest';
import { ShowtimeFilterBarComponent } from '../src/index';

describe('ShowtimeFilterBarComponent', () => {
  it('exports ShowtimeFilterBarComponent', () => {
    expect(ShowtimeFilterBarComponent).toBeDefined();
  });

  it('formats display labels accurately', () => {
    const comp = Object.create(ShowtimeFilterBarComponent.prototype);
    expect(comp.formatDisplay('2D')).toBe('2D Digital Standard');
    expect(comp.formatDisplay('3D')).toBe('3D RealD Cinema');
    expect(comp.formatDisplay('IMAX')).toBe('IMAX Laser');
    expect(comp.formatDisplay('4DX')).toBe('4DX Motion');
    expect(comp.formatDisplay('ScreenX')).toBe('ScreenX 270°');
    expect(comp.formatDisplay('Custom')).toBe('Custom');
  });

  it('emits clearFilter correctly for search and selects', () => {
    const comp = Object.create(ShowtimeFilterBarComponent.prototype);
    const emitSpy = vi.fn();
    comp.filterChanged = { emit: emitSpy };

    comp.clearFilter('searchQuery');
    expect(emitSpy).toHaveBeenCalledWith({ searchQuery: '' });

    comp.clearFilter('movieId');
    expect(emitSpy).toHaveBeenCalledWith({ movieId: null });

    comp.clearFilter('cinemaId');
    expect(emitSpy).toHaveBeenCalledWith({ cinemaId: null });
  });
});
