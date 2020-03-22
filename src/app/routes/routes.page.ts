import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { OutdoorRoute, RouteFactory, TransportMode, SessionService } from '../core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
    selector: 'app-routes',
    templateUrl: './routes.page.html',
    styleUrls: ['./routes.page.scss']
})
export class RoutesPage implements OnInit {
    form: FormGroup;
    routes: OutdoorRoute[];
    transportMode: TransportMode;
    loading: boolean;
    onDestroy = new Subject<void>();


    constructor(private formBuilder: FormBuilder, private routeFactory: RouteFactory, private sessionService: SessionService) { }

    ngOnInit() {
        const currentTime = new Date(Date.now());
        const hourMinutes = currentTime.getHours() + ':' + currentTime.getMinutes();
        
        this.form = this.formBuilder.group({
            from: ['', Validators.required],
            to: ['', Validators.required],
            departAt: ['Depart At'],
            time: [hourMinutes]
        });

        this.form.statusChanges
            .pipe(takeUntil((this.onDestroy = new Subject<void>())))
            .subscribe((res) => {
                if (res === 'VALID'){
                    this.getRoutes();
                }
            });
    }

    async getRoutes() {
        if (!this.transportMode) {
            this.transportMode = TransportMode.TRANSIT;
        }
        this.loading = true;
        const date = new Date();
        const minHours = this.form.controls.time.value.split(':');
        date.setHours(minHours[0]);
        date.setMinutes(minHours[1]);

        if (this.form.controls.departAt.value === 'Depart At') {
            this.routes = await this.routeFactory.generateDefaultRoutes(
                this.form.controls.from.value,
                this.form.controls.to.value,
                date,
                null,
                this.transportMode
            );
        } else {
            this.routes = await this.routeFactory.generateDefaultRoutes(
                this.form.controls.from.value,
                this.form.controls.to.value,
                null,
                date,
                this.transportMode
            );
        }
        this.loading = false;
    }

    setTransportMode(transportMode: string) {
        this.transportMode = TransportMode[transportMode];
        this.getRoutes();
    }

    submit() {
        this.getRoutes();
    }

    setFrom(event: google.maps.places.PlaceResult) {
        console.log(event);
        this.form.controls.from.setValue(event.formatted_address);
    }

    setTo(event: any) {
        console.log(event);
        this.form.controls.to.setValue(event.formatted_address);
    }
}
