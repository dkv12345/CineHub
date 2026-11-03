import { describe, expect, it, vi } from 'vitest';
import { ChatbotWidgetComponent } from '../src/index';

describe('ChatbotWidgetComponent', () => {
  it('exports ChatbotWidgetComponent', () => {
    expect(ChatbotWidgetComponent).toBeDefined();
  });

  it('computes correct age badge styling class', () => {
    const component = Object.create(ChatbotWidgetComponent.prototype);
    expect(component.getAgeBadgeClass('P')).toContain('emerald');
    expect(component.getAgeBadgeClass('K')).toContain('teal');
    expect(component.getAgeBadgeClass('T13')).toContain('blue');
    expect(component.getAgeBadgeClass('T16')).toContain('amber');
    expect(component.getAgeBadgeClass('T18')).toContain('rose');
    expect(component.getAgeBadgeClass(null)).toContain('slate');
  });

  it('navigates to seats or movie detail on booking action', () => {
    const navigate = vi.fn();
    const toggleWidget = vi.fn();
    const component = Object.create(ChatbotWidgetComponent.prototype);
    component.router = { navigate };
    component.store = { toggleWidget };

    component.goToSeats('st-101');
    expect(navigate).toHaveBeenCalledWith(['/seats', 'st-101']);
    expect(toggleWidget).toHaveBeenCalled();

    navigate.mockClear();
    toggleWidget.mockClear();

    // Movie with showtime goes directly to seats
    component.bookMovie({
      id: 'm-1',
      title: 'Phim 1',
      nextShowtimes: [{ id: 'st-202', time: '19:30', date: 'Hôm nay' }],
    });
    expect(navigate).toHaveBeenCalledWith(['/seats', 'st-202']);

    navigate.mockClear();
    toggleWidget.mockClear();

    // Movie without showtime goes to movie detail
    component.bookMovie({
      id: 'm-2',
      title: 'Phim 2',
      nextShowtimes: [],
    });
    expect(navigate).toHaveBeenCalledWith(['/movie', 'm-2']);
  });
});
