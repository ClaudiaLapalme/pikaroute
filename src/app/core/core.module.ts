import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Geolocation } from '@ionic-native/geolocation/ngx';
import { NativeGeocoder } from '@ionic-native/native-geocoder/ngx';
import { IonicModule } from '@ionic/angular';
import {
    DirectionsButtonComponent,
    IndoorMapComponent,
    LoaderComponent,
    LocationButtonComponent,
    SearchComponent,
    ToggleCampusComponent,
    ToggleFloorsComponent,
} from './components';
import {
    AbstractPOIFactoryService,
    OutdoorPOIFactoryService,
    RouteFactory,
} from './factories';
import {
    GoogleApisService,
    LocationService,
    MapService,
    PlaceService,
} from './services';

@NgModule({
    declarations: [
        ToggleCampusComponent,
        ToggleFloorsComponent,
        IndoorMapComponent,
        SearchComponent,
        LoaderComponent,
        DirectionsButtonComponent,
        IndoorMapComponent,
        LocationButtonComponent,
    ],
    imports: [
        CommonModule,
        IonicModule,
        FormsModule,
        ReactiveFormsModule
    ],
    providers: [
        LocationService,
        MapService,
        NativeGeocoder,
        Geolocation,
        GoogleApisService,
        OutdoorPOIFactoryService,
        AbstractPOIFactoryService,
        RouteFactory,
        PlaceService,
        LocationButtonComponent,
    ],
    exports: [
        ToggleCampusComponent,
        ToggleFloorsComponent,
        IndoorMapComponent,
        SearchComponent,
        LoaderComponent,
        DirectionsButtonComponent,
        IndoorMapComponent,
        LocationButtonComponent,
    ],
    entryComponents: []
})
export class CoreModule { }
