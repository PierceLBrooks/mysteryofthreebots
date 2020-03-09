import {
  Injectable,
  Renderer2,
  RendererFactory2,
  Inject,
  ComponentFactoryResolver,
  Injector,
  ApplicationRef,
  EmbeddedViewRef,
  ComponentRef,
  EventEmitter,
  Type,
  OnDestroy
} from '@angular/core';
import { DOCUMENT } from '@angular/common';

@Injectable({
  providedIn: 'root'
})
export class DialogService implements OnDestroy {
  private readonly renderer: Renderer2;
  private dialog: HTMLElement;
  private backdrop: HTMLElement;
  private readonly componentCache = new Map<Type<any>, ComponentRef<void>>();

  constructor(
    rendererFactory: RendererFactory2,
    private readonly resolver: ComponentFactoryResolver,
    private readonly injector: Injector,
    private readonly appRef: ApplicationRef,
    @Inject(DOCUMENT) private readonly document: HTMLDocument
  ) {
    this.renderer = rendererFactory.createRenderer(null, null);
    this.handleCloseDialog = this.handleCloseDialog.bind(this);
  }

  open(component: Type<any>) {
    let componentRef = this.componentCache.get(component);
    if (!componentRef) {
      const componentFactory = this.resolver.resolveComponentFactory(component);
      componentRef = componentFactory.create(this.injector);
      this.componentCache.set(component, componentRef);
      this.appRef.attachView(componentRef.hostView);
      const closeDialog = (componentRef.instance as any).closeDialog;
      if (closeDialog && closeDialog instanceof EventEmitter) {
        (closeDialog as EventEmitter<void>).subscribe(() => {
          this.close();
        });
      }
    }
    if (!this.backdrop) {
      this.backdrop = this.document.getElementById('app-dialog-backdrop');
    }
    if (!this.dialog) {
      this.dialog = this.document.getElementById('app-dialog');
      this.dialog.addEventListener('close-dialog', this.handleCloseDialog, true);
    }
    this.renderer.addClass(this.backdrop, 'is-open');
    this.dialog.innerHTML = '';
    this.renderer.appendChild(this.dialog, (componentRef.hostView as EmbeddedViewRef<any>).rootNodes[0]);
  }

  close() {
    if (!this.backdrop) {
      return;
    }
    this.renderer.removeClass(this.backdrop, 'is-open');
  }

  handleCloseDialog() {
    this.close();
  }

  ngOnDestroy() {
    if (this.dialog) {
      this.dialog.removeEventListener('close-dialog', this.handleCloseDialog);
    }
  }
}
