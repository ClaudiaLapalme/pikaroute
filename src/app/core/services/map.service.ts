import { ElementRef, Injectable } from '@angular/core';
import { Geoposition } from '@ionic-native/geolocation/ngx';
import { BehaviorSubject } from 'rxjs';
import { AbstractPOIFactoryService } from '../factories';
import { Building, IndoorMap, IndoorRoute, Map, OutdoorMap, OutdoorRoute, Route, Coordinates } from '../models';
import { GoogleApisService } from './google-apis.service';
import { IconService } from './icon.service';
import { LocationService } from './location.service';
import { PlaceService } from './place.service';
import { RoutesService } from './routes.service';
import { ShuttleService } from './shuttle.service';

@Injectable()
export class MapService {
    private outdoorMap: Map;

    // A persistence variable for indoor polyline tracking
    private drawnPolyline: google.maps.Polyline = null;

    private showToggleFloorButton = new BehaviorSubject(false);
    public showToggleFloorButtonObservable = this.showToggleFloorButton.asObservable();

    private campusSelectedInBounds = new BehaviorSubject(0);
    public campusSelectedInBoundsObservable = this.campusSelectedInBounds.asObservable();

    constructor(
        private locationService: LocationService,
        private googleApis: GoogleApisService,
        private placeService: PlaceService,
        private abstractPOIFactoryService: AbstractPOIFactoryService,
        private shuttleService: ShuttleService,
        private iconService: IconService
    ) {
        this.loadOutdoorMap();
    }

    SGW_COORDINATES: google.maps.LatLng = new google.maps.LatLng (
        45.4959053,
        -73.5801141
    );

    LOY_COORDINATES: google.maps.LatLng = new google.maps.LatLng (
        45.4582, 
        -73.6405
    );

    /**
     * Given a map reference create a map
     * @param mapElement the reference to the html map
     */
    async loadMap(mapElement: ElementRef): Promise<google.maps.Map<Element>> {
        let mapOptions: google.maps.MapOptions = {
            center: this.SGW_COORDINATES,
            zoom: 15,
            mapTypeControlOptions: {
                mapTypeIds: [google.maps.MapTypeId.ROADMAP]
            },
            disableDefaultUI: true,
            mapTypeControl: false,
            scaleControl: true,
            zoomControl: false,
            mapTypeId: google.maps.MapTypeId.ROADMAP
        };

        try {
            const geoPos: Geoposition = await this.locationService.getGeoposition();
            if (geoPos) {
                const latLng = this.googleApis.createLatLng(
                    geoPos.coords.latitude,
                    geoPos.coords.longitude
                );

                mapOptions.center = latLng;

                const mapObj = this.googleApis.createMap(
                    mapElement,
                    mapOptions
                );
                this.googleApis.createMarker(latLng, mapObj, this.iconService.getLocationIcon());
                this.placeService.enableService(mapObj);

                this.displayBuildingsOutline(mapObj);
                this.createIndoorPOIsLabels(mapObj);

                mapObj.addListener(
                    'tilesloaded',
                    this.tilesLoadedHandler(mapObj)
                );

                return mapObj;
            } else {
                return this.googleApis.createMap(mapElement, mapOptions);
            }
        } catch (error) {
            console.log(error);
            return this.googleApis.createMap(mapElement, mapOptions);
        }
    }

    private tilesLoadedHandler(mapObj: google.maps.Map): () => void {
        return () => {
            this.trackBuildingsOutlinesDisplay(mapObj.getZoom());
            this.trackBuildingCodeDisplay(mapObj.getZoom());
            this.trackFloorToggleButton(mapObj);
            this.trackCampusToggleButton(mapObj);
        };
    }

    private loadOutdoorMap(): void {

        const outdoorPOIFactory = this.abstractPOIFactoryService.createOutdoorPOIFactory();
        outdoorPOIFactory.setMapService(this);

        this.outdoorMap = new OutdoorMap(outdoorPOIFactory.loadOutdoorPOIs());
    }

    /**
     * Right now, this function only loads the indoors maps for three floors
     * of the H building (1,8,9).
     */
    public loadIndoorMaps(): Record<number, IndoorMap> {
        const floors = [1, 8, 9];
        const indoorMapFactory = this.abstractPOIFactoryService.createIndoorPOIFactory();
        let indoorMaps: Record<number, IndoorMap> = {};

        for (let floor of floors) {
            const floorPOIs = indoorMapFactory.loadFloorPOIs(floor);
            const indoorMap = new IndoorMap(floor, 'H', floorPOIs);
            indoorMaps[floor] = indoorMap;
        }

        return indoorMaps;
    }

    private displayBuildingsOutline(mapRef: google.maps.Map<Element>): void {
        const outdoorPOIs = this.outdoorMap.getPOIs();

        for (const outdoorPOI of outdoorPOIs) {
            if (outdoorPOI instanceof Building) {
                outdoorPOI.createBuildingOutline(mapRef, this.placeService);
            }
        }
    }

    private createIndoorPOIsLabels(mapRef: google.maps.Map<Element>): void {
        const hBuilding = <Building>this.outdoorMap.getPOI('Henry F. Hall Building');
        const indoorMaps = hBuilding.getIndoorMaps();

        for (const floorNumber in indoorMaps) {
            indoorMaps[floorNumber].createIndoorPOIsLabels(mapRef);
        }
    }

    /**
     * When the zoom value on the map is 19 or higher, the outline of the focused building is removed.
     * Right now, only the H building is affected by this feature since it is the only building with
     * indoor map implemented.
     */
    private trackBuildingsOutlinesDisplay(zoomValue: number): void {
        const hallBuildingName = 'Henry F. Hall Building';
        const building = this.outdoorMap.getPOI(hallBuildingName);

        if (building instanceof Building) {
            if (zoomValue >= 19) {
                building.removeBuildingOutline();
                building.removeBuildingLabel();
            } else {
                building.displayBuildingOutline();
                building.displayBuildingLabel();
            }
        }
    }

    /**
     * When the zoom value on the map is 18 or higher, the labels on the Concordia Buildings are displayed.
     */
    private trackBuildingCodeDisplay(zoomValue: number): void {
        const outdoorPOIs = this.outdoorMap.getPOIs();

        for (let outdoorPOI of outdoorPOIs) {
            if (outdoorPOI instanceof Building) {
                if (zoomValue >= 18) {
                    outdoorPOI.displayBuildingLabel();
                } else {
                    outdoorPOI.removeBuildingLabel();
                }
            }
        }
    }

    /**
     * When the zoom value on the map is 19 or higher and the focused building is visible,
     * the toggle floor button is displayed. Right now, only the H building is affected
     * by this feature since it is the only building with indoor map implemented.
     */
    private trackFloorToggleButton(mapObj: google.maps.Map): void {
        const hallBuildingName = 'Henry F. Hall Building';
        const building = <Building>this.outdoorMap.getPOI(hallBuildingName);
        const zoomValue = mapObj.getZoom();
        const inBounds = mapObj.getBounds().contains(building.getMarkerPosition());

        if (zoomValue >= 19 && inBounds) {
            this.showToggleFloorButton.next(true);
        } else {
            this.showToggleFloorButton.next(false);
        }

    }

    /**
     * Warns the observers on if a campus is in view on the map.
     * If there is a campus in view, it tells the obersvers which ones.
     * @param mapObj 
     */
    private trackCampusToggleButton(mapObj: google.maps.Map): void {
        const inBoundsSGW = mapObj.getBounds().contains(this.SGW_COORDINATES);
        const inBoundsLOY = mapObj.getBounds().contains(this.LOY_COORDINATES);
        
        if (inBoundsSGW) {
            this.campusSelectedInBounds.next(1);
        }
        else if (inBoundsLOY) {
            this.campusSelectedInBounds.next(2);
        }
        else {
            this.campusSelectedInBounds.next(0);
        }
    }

    async getUserLocation(): Promise<google.maps.LatLng> {
        const geoPos: Geoposition = await this.locationService.getGeoposition();

        if (geoPos) {
            return this.googleApis.createLatLng(
                geoPos.coords.latitude,
                geoPos.coords.longitude
            );
        }

        return this.SGW_COORDINATES;
    }

    displayRoute(map: google.maps.Map, route: Route, indoorMapLevel?: number) {
        if (route instanceof OutdoorRoute) {
            this.displayOutdoorRoute(map, route);
        } else if (route instanceof IndoorRoute) {
            this.displayIndoorRoute(map, route, indoorMapLevel);
        }
    }

    /**
     * Wraps google API request. In addition, filters the resulting list to render only the selected route
     * @param map map object to render the route on
     * @param route route to render on the map
     */
    displayOutdoorRoute(map: google.maps.Map, route: OutdoorRoute): void {
        const renderer = this.getMapRenderer();
        renderer.setMap(map);

        if (this.shuttleService.isShuttleRoute(route)) {
            this.shuttleService.displayShuttleRoute(map, route);
        } else {
            this.googleApis
                .getDirectionsService()
                .route(route.getDirectionsRequestFromRoute(), (res: google.maps.DirectionsResult, status) => {
                    if (status === 'OK') {
                        renderer.setDirections(res);
                        const matchingRouteIndex = this.filterOutRoute(res, route.startTime, route.endTime);
                        renderer.setRouteIndex(matchingRouteIndex);
                    } else {
                        console.log('Directions request failed due to ' + status);
                    }
                });
        }
    }

    /**
     * Filter method allowing us to display only the route passed from the routes page
     * @param res result returned by the google API
     * @param startTime expected true start time
     * @param endTime expected true end time
     * @returns index of the route matching start and end times
     */
    private filterOutRoute(res: google.maps.DirectionsResult, startTime: Date, endTime: Date): number {
        for (let i = 0; i < res.routes.length; i++) {
            if (res.routes[i].legs[0].departure_time.value.getTime() === startTime.getTime()
                && res.routes[i].legs[0].arrival_time.value.getTime() === endTime.getTime()) {
                return i;
            }
        }
        return -1;
    }

    /**
     * Method to display indoor routing using google Polylines. Tracks previous drawing, clearing it out per request
     * @param map map object to render the route on
     * @param indoorRoute route to render on the map
     * @param indoorMapLevel floor for which to draw the polyline
     */
    displayIndoorRoute(map: google.maps.Map, indoorRoute: IndoorRoute, indoorMapLevel: number): void {
        const startCoords: Coordinates = indoorRoute.startCoordinates;
        const startLocation: google.maps.LatLng =
            new google.maps.LatLng(startCoords.getLatitude(), startCoords.getLongitude());

        // Clear polylines previously drawn in order to keep the needed polylines per floor only
        if (this.drawnPolyline != null) {
            this.drawnPolyline.setMap(null);
        }

        // If there are route steps for current floor, draw a directions polyline for that floor
        indoorRoute.routeSteps.forEach(routeStep => {
            if (routeStep.startCoordinate.getFloorNumber() === indoorMapLevel
                && routeStep.endCoordinate.getFloorNumber() === indoorMapLevel) {
                this.drawnPolyline = this.googleApis.createPolyline(mapCoordinatesArrayToLatLng(routeStep.path), true, 'red', 1.0, 2);
                this.drawnPolyline.setMap(map);
            }
        });

        map.setCenter(startLocation);
        map.setZoom(19);

        function mapCoordinatesArrayToLatLng(coordinates: Coordinates[]): google.maps.LatLng[] {
            const latLngArray: google.maps.LatLng[] = [];
            for (const coords of coordinates) {
                latLngArray.push(coordinatesToLatLng(coords));
            }
            return latLngArray;
        }

        function coordinatesToLatLng(coordinates: Coordinates): google.maps.LatLng {
            return new google.maps.LatLng(coordinates.getLatitude(), coordinates.getLongitude());
        }
    }

    getMapRenderer(): google.maps.DirectionsRenderer {
        return this.googleApis.getMapRenderer();
    }

    public getOutdoorMap(): OutdoorMap {
        return this.outdoorMap;
    }

    public createDestinationMarkers(map: google.maps.Map, route: Route): void {

        const startLocation: google.maps.LatLng =
            new google.maps.LatLng(route.startCoordinates.getLatitude(), route.startCoordinates.getLongitude());

        const endLocation: google.maps.LatLng =
            new google.maps.LatLng(route.endCoordinates.getLatitude(), route.endCoordinates.getLongitude());

        const startMarker = this.googleApis.createMarker(startLocation, map, this.iconService.getStartIcon());
        startMarker.setVisible(false);

        const endMarker = this.googleApis.createMarker(endLocation, map, this.iconService.getEndIcon());
        endMarker.setVisible(false);

        const destinationMarkers = [startMarker, endMarker];

        const hallBuildingName = 'Henry F. Hall Building';
        const building = this.outdoorMap.getPOI(hallBuildingName) as Building;
        const indoorMaps = building.getIndoorMaps();

        if (route.startCoordinates.getFloorNumber() === route.endCoordinates.getFloorNumber()) {
            indoorMaps[route.startCoordinates.getFloorNumber()].setDestinationMarkers(destinationMarkers);
        } else {
            indoorMaps[route.startCoordinates.getFloorNumber()].setDestinationMarkers([startMarker]);
            indoorMaps[route.endCoordinates.getFloorNumber()].setDestinationMarkers([endMarker]);
        }
    }

    public deleteDestinationMarkers(): void {
        const hallBuildingName = 'Henry F. Hall Building';
        const building = this.outdoorMap.getPOI(hallBuildingName) as Building;
        const indoorMaps = building.getIndoorMaps();

        for (const listIndex in indoorMaps) {
            indoorMaps[listIndex].deleteDestinationMarkers();
        }
    }
}
