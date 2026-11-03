import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  input,
  NgZone,
  PLATFORM_ID,
  signal,
  viewChild,
} from '@angular/core';
import * as THREE from 'three';
import type { SeatCell, SeatLayout } from './seat-layout';

/**
 * Interactive Three.js 3D Seat Point-of-View (POV) camera preview.
 * - Initialized strictly inside `NgZone.runOutsideAngular` and guarded with `isPlatformBrowser`.
 * - Pauses `requestAnimationFrame` loop when document tab is hidden.
 * - Disposes all Three.js geometries, materials, and `WebGLRenderer` in `DestroyRef.onDestroy`.
 */
@Component({
  selector: 'ch-seat-pov-scene',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="cinema-panel overflow-hidden shadow-xs">
      <div
        class="flex items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-surface-secondary)] px-4 py-2.5 text-xs"
      >
        <div class="font-bold text-[var(--color-text-primary)]">
          <span class="cinema-eyebrow !text-[10px]">3D POV · </span>
          <span>Ghế {{ activeSeat()?.id ?? 'Trung tâm (F8)' }}</span>
        </div>
        <span class="text-[11px] text-[var(--color-text-secondary)]">
          {{ webglActive() ? 'Mô phỏng WebGL 3D' : 'Góc nhìn chuẩn' }}
        </span>
      </div>

      <div
        #canvasHost
        data-testid="seat-pov-canvas-host"
        class="relative h-56 w-full bg-[#1e1a18] flex items-center justify-center overflow-hidden"
      >
        @if (!webglActive()) {
          <div class="text-center text-xs text-[#fffdf9] px-4 space-y-2">
            <div
              class="mx-auto h-16 w-48 rounded-[3px] border border-[var(--color-brand-accent)] bg-[#24201d] flex items-center justify-center font-display text-xs font-bold text-[var(--color-brand-accent)]"
            >
              MÀN HÌNH CHÍNH ({{ activeSeat()?.id ?? 'F8' }})
            </div>
            <p class="text-[11px] text-[#ddd3c5]">
              Góc nghiêng và tầm nhìn trực diện tối ưu tới tâm màn hình
            </p>
          </div>
        }
      </div>
    </div>
  `,
})
export class SeatPOVSceneComponent implements AfterViewInit {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly ngZone = inject(NgZone);
  private readonly destroyRef = inject(DestroyRef);
  private readonly document = inject(DOCUMENT);

  readonly layout = input.required<SeatLayout>();
  readonly activeSeat = input<SeatCell | null>(null);
  readonly canvasHost = viewChild<ElementRef<HTMLElement>>('canvasHost');

  readonly webglActive = signal(false);

  private camera: THREE.PerspectiveCamera | null = null;

  constructor() {
    effect(() => {
      const seat = this.activeSeat();
      const currentLayout = this.layout();
      if (!this.camera) return;

      const rowIdx = seat ? seat.rowIndex : Math.floor(currentLayout.rows / 2);
      const colIdx = seat ? seat.column : Math.floor(currentLayout.columns / 2);
      const xOffset = (colIdx - currentLayout.columns / 2) * 0.65;
      const zDistance = 4.5 + rowIdx * 0.85;
      const yHeight = 1.2 + rowIdx * 0.18;

      this.camera.position.set(xOffset, yHeight, zDistance);
      this.camera.lookAt(0, 1.8, -4);
    });
  }

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    const container = this.canvasHost()?.nativeElement;
    if (!container) {
      return;
    }

    this.ngZone.runOutsideAngular(() => {
      let renderer: THREE.WebGLRenderer | null = null;
      const geometries: THREE.BufferGeometry[] = [];
      const materials: THREE.Material[] = [];
      let animationFrameId: number | null = null;
      let isPaused = false;

      try {
        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setSize(container.clientWidth || 480, container.clientHeight || 224);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        container.innerHTML = '';
        container.appendChild(renderer.domElement);
        this.webglActive.set(true);
      } catch {
        // Headless browser without WebGL context falls back cleanly
        this.webglActive.set(false);
        return;
      }

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(
        60,
        (container.clientWidth || 480) / (container.clientHeight || 224),
        0.1,
        100,
      );
      camera.position.set(0, 2.2, 8.5);
      camera.lookAt(0, 1.8, -4);
      this.camera = camera;

      // Cinema Screen Mesh (Champagne Gold tone)
      const screenGeo = new THREE.PlaneGeometry(9.5, 4.2, 16, 1);
      const screenMat = new THREE.MeshBasicMaterial({
        color: 0xb28a50,
        side: THREE.DoubleSide,
      });
      geometries.push(screenGeo);
      materials.push(screenMat);
      const screenMesh = new THREE.Mesh(screenGeo, screenMat);
      screenMesh.position.set(0, 2.1, -4.2);
      scene.add(screenMesh);

      // Auditorium Floor Grid (Restrained Espresso wireframe)
      const floorGeo = new THREE.PlaneGeometry(14, 16);
      const floorMat = new THREE.MeshBasicMaterial({
        color: 0x3d3632,
        wireframe: true,
      });
      geometries.push(floorGeo);
      materials.push(floorMat);
      const floorMesh = new THREE.Mesh(floorGeo, floorMat);
      floorMesh.rotation.x = -Math.PI / 2;
      scene.add(floorMesh);

      const renderLoop = (): void => {
        if (isPaused || !renderer) return;
        renderer.render(scene, camera);
        animationFrameId = requestAnimationFrame(renderLoop);
      };
      renderLoop();

      const onVisibilityChange = (): void => {
        if (this.document.hidden) {
          isPaused = true;
          if (animationFrameId !== null) {
            cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
          }
        } else if (isPaused) {
          isPaused = false;
          renderLoop();
        }
      };

      this.document.addEventListener('visibilitychange', onVisibilityChange);

      this.destroyRef.onDestroy(() => {
        isPaused = true;
        this.document.removeEventListener('visibilitychange', onVisibilityChange);
        if (animationFrameId !== null) {
          cancelAnimationFrame(animationFrameId);
        }
        for (const geo of geometries) {
          geo.dispose();
        }
        for (const mat of materials) {
          mat.dispose();
        }
        renderer?.dispose();
      });
    });
  }
}
