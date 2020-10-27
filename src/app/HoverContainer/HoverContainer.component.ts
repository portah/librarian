import { Component, OnInit, HostListener, ElementRef, Input, Output, EventEmitter, NgZone } from '@angular/core';
import { AnimationEvent } from '@angular/animations';
import { HoverContainerAnimations } from './HoverContainerAnimations';
import { Subject, merge } from 'rxjs';
import { debounceTime } from 'rxjs/operators';

@Component({
  // tslint:disable-next-line:component-selector
  selector: 'hover-container',
  templateUrl: 'HoverContainer.component.html',
  styleUrls: ['./HoverContainer.component.scss'],
  animations: HoverContainerAnimations,
})
export class HoverContainerComponent {

  state;
  stateToShow;

  cardHover$ = new Subject();

  @Input()
  book: any = {};

  @Input()
  selected: any = false;
  @Output()
  selectedChange = new EventEmitter<any>();

  @HostListener('mouseenter', ['$event'])
  @HostListener('mouseleave', ['$event'])
  @HostListener('mousemove', ['$event'])
  onHover(event: MouseEvent) {
    const direction = event.type === 'mouseleave' ? 'out' : 'in';
    // const host = event.target as HTMLElement;
    // const w = host.offsetWidth;
    // const h = host.offsetHeight;

    // const x = (event.pageX - host.offsetLeft - (w / 2)) * (w > h ? (h / w) : 1);
    // const y = (event.pageY - host.offsetTop - (h / 2)) * (h > w ? (w / h) : 1);
    // const states = ['top', 'right', 'bottom', 'left'];
    // const side = Math.round((((Math.atan2(y, x) * (180 / Math.PI)) + 180) / 90) + 3) % 4;
    // this.stateToShow = `${direction}-${states[side]}`;
    this.cardHover$.next('mouse');
    this.stateToShow = `${direction}-top`;
  }

  constructor(private zone: NgZone) {
    merge(this.cardHover$, this.selectedChange).
      pipe(
        debounceTime(10)
      ).subscribe((d) => {
        // console.log(d, this.state, this.stateToShow);
        this.zone.run(() => {
          if (this.selected || d === true) {
            if (!this.state) {
              this.state = 'in-top';
            }
            return;
          }

          if (d === 'mouse') {
            this.state = this.stateToShow;
          }

        });
      });
  }


  onDone(event: AnimationEvent) {
    this.stateToShow = event.toState.startsWith('out-') ? null : this.stateToShow;
    this.cardHover$.next('mouse');
  }

  bookSelect(event, book) {
    console.log(event);
    event.stopPropagation();
    this.selectedChange.emit(this.selected);
  }

}
