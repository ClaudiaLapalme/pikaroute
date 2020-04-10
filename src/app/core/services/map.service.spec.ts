import { ElementRef } from '@angular/core';
import { Geoposition } from '@ionic-native/geolocation/ngx';
import { MapService } from './map.service';
import { OutdoorMap, Campus, Building, POI, IndoorMap, Coordinates } from '../models';
import { OutdoorPOIFactoryService, IndoorPOIFactoryService } from '../factories';
import { IndoorPOI } from '../models/indoor-poi';
import { ShuttleService } from './shuttle.service';

describe('MapService', () => {

    class MockOutdoorPOIFactoryService extends OutdoorPOIFactoryService {
        setMapService() {
            this['mapService'] = jasmine.createSpyObj('PlaceService', [
                'loadIndoorMaps'
            ]);
        }
    }

    class MockIndoorPOIFactoryService extends IndoorPOIFactoryService {
        loadFloorPOIs() {
            return null;
        }
    }

    function testServiceSetup() {
        const locationServiceSpy = jasmine.createSpyObj('LocationService', [
            'getGeoposition',
            'getAddressFromLatLng'
        ]);
        const googleApisServiceSpy = jasmine.createSpyObj('GoogleApisService', [
            'createMap',
            'createMarker',
            'createLatLng',
            'mapReference',
            'getMapRenderer',
            'mapReference'
        ]);
        const placeServiceSpy = jasmine.createSpyObj('PlaceService', [
            'enableService'
        ]);
        const abstractPOIFactoryService = jasmine.createSpyObj('AbstractPOIFactoryService', [
            'createOutdoorPOIFactory',
            'createIndoorPOIFactory'
        ]);
        const shuttleService = jasmine.createSpyObj('ShuttleService', [
            'displayShuttleRoute'
        ]);
        const mockIconService  = jasmine.createSpyObj('mockIconService', ['getLocationIcon']);



        abstractPOIFactoryService.createOutdoorPOIFactory.and.returnValue(new MockOutdoorPOIFactoryService);
        abstractPOIFactoryService.createIndoorPOIFactory.and.returnValue(new MockIndoorPOIFactoryService);

        const mapService: MapService = new MapService(
            locationServiceSpy,
            googleApisServiceSpy,
            placeServiceSpy,
            abstractPOIFactoryService,
            shuttleService,
            mockIconService
        );
        return { mapService, locationServiceSpy, googleApisServiceSpy, abstractPOIFactoryService };
    }

    it('should be created', () => {
        const { mapService } = testServiceSetup();
        expect(mapService).toBeTruthy();
    });

    class MockMaps extends google.maps.Map {
        addListener() {
            return null;
        }
        getZoom(): number {
            return null;
        }
    }

    describe('loadMap()', () => {
        class MockElementRef extends ElementRef {
            nativeElement = {};
        }

        it('should return a map', () => {
            const {
                mapService,
                locationServiceSpy,
                googleApisServiceSpy
            } = testServiceSetup();

            const mapElement = new MockElementRef({});

            const mockGeoposition: Partial<Geoposition> = {
                coords: {
                    latitude: 12,
                    longitude: 34,
                    accuracy: 45,
                    altitude: 35,
                    altitudeAccuracy: 123,
                    heading: 421,
                    speed: 12
                }
            };
            locationServiceSpy.getGeoposition.and.returnValue(mockGeoposition);
            const mockMap = new MockMaps(null);

            const mockLatLng = new google.maps.LatLng(55, 66);
            const latKey = 'lat';
            const lngKey = 'lng';
            mockLatLng[latKey] = () => 55;
            mockLatLng[lngKey] = () => 566;

            googleApisServiceSpy.createMap.and.returnValue(mockMap);
            googleApisServiceSpy.createLatLng.and.returnValue(mockLatLng);
            mapService.loadMap(mapElement);

            expect(locationServiceSpy.getGeoposition).toHaveBeenCalledTimes(1);
        });

        it('should catch when an error occurs', () => {
            const {
                mapService,
                locationServiceSpy,
                googleApisServiceSpy
            } = testServiceSetup();

            const mapElement = new MockElementRef({});

            const mockGeoposition: Partial<Geoposition> = {
                coords: {
                    latitude: 12,
                    longitude: 34,
                    accuracy: 45,
                    altitude: 35,
                    altitudeAccuracy: 123,
                    heading: 421,
                    speed: 12
                }
            };

            const mockMap = new MockMaps(null);

            mapService.loadMap(mapElement);

            expect(locationServiceSpy.getGeoposition).toHaveBeenCalledTimes(1);
        });

        it('should call getGeoposition from locationService and get nothing', () => {
            const {
                mapService,
                locationServiceSpy,
                googleApisServiceSpy
            } = testServiceSetup();

            const mapElement = new MockElementRef({});
            mapService.loadMap(mapElement);

            expect(locationServiceSpy.getGeoposition).toHaveBeenCalledTimes(1);
        });
    });

    describe('getUserLocation()', () => {
        it("should return the user's location when available", () => {
            const {
                mapService,
                locationServiceSpy,
                googleApisServiceSpy
            } = testServiceSetup();
            const mockGeoposition: Partial<Geoposition> = {
                coords: {
                    latitude: 12,
                    longitude: 34,
                    accuracy: 45,
                    altitude: 35,
                    altitudeAccuracy: 123,
                    heading: 421,
                    speed: 12
                }
            };

            locationServiceSpy.getGeoposition.and.returnValue(mockGeoposition);
            mapService.getUserLocation();
            expect(locationServiceSpy.getGeoposition).toHaveBeenCalledTimes(1);
        });
    });

    describe('getOutdoorMap()', () => {
        it("should return outdoor map", () => {
            const { mapService } = testServiceSetup();
            const outdoorMap = mapService.getOutdoorMap();

            expect(outdoorMap).toBeTruthy();
        });
    });

    describe('trackBuildingsOutlinesDisplay', () => {
        const testBuildingName = 'Henry F. Hall Building';

        class MockIndoorMap extends IndoorMap{
            constructor() {
                super(null,null,null)
                this['listOfPOIs'] = [new IndoorPOI(null, new Coordinates(null,null,null), null)]
            }
        }

        class MockBuilding extends Building {
            removeOutlineCalled = false;

            constructor() {
                super(testBuildingName, null, null, {8: new MockIndoorMap});
            }

            removeBuildingOutline(): void {
                this.removeOutlineCalled = true;
            }
        }

        class MockCampus extends Campus {
            removeOutlineCalled = false;
            displayOutlineCalled = false;

            constructor() {
                super(testBuildingName, null, null, [new MockBuilding]);
            }

            removeBuildingOutline(): void {
                this.removeOutlineCalled = true;
            }

            displayBuildingOutline(): void {
                this.removeOutlineCalled = true;
            }
        }

        it('should remove hall building outline at zoom 20 or more', () => {
            const { mapService } = testServiceSetup();

            mapService['trackBuildingsOutlinesDisplay'](20);

            const hallBuilding = mapService['outdoorMap'].getPOI(
                testBuildingName
            );

            expect(hallBuilding['buildingOutline'].getVisible()).toBeFalsy;
        });

        it('should not try to display the outline of a no building object', () => {
            const { mapService } = testServiceSetup();

            let campusMock = new MockCampus();

            mapService['outdoorMap'] = new OutdoorMap([campusMock]);
            mapService['trackBuildingsOutlinesDisplay'](20);

            expect(campusMock.removeOutlineCalled).toBeFalsy();
            expect(campusMock.displayOutlineCalled).toBeFalsy();
        });
    });

    describe('trackBuildingCodeDisplay', () => {
        const testBuildingName = 'Henry F. Hall Building';

        class MockBuilding extends Building {
            removeCodeCalled = false;
            displayCodeCalled = false;

            constructor() {
                super(testBuildingName, null, null, null);
            }

            removeBuildingCode(): void {
                this.removeCodeCalled = true;
            }
            displayBuildingCode(): void {
                this.displayCodeCalled = true;
            }
        }

        class MockCampus extends Campus {
            removeCodeCalled = false;
            displayCodeCalled = false;

            constructor() {
                super(testBuildingName, null, null, null);
            }

            removeBuildingCode(): void {
                this.removeCodeCalled = true;
            }

            displayBuildingCode(): void {
                this.displayCodeCalled = true;
            }
        }

        it('should display building code at zoom 18 or more', () => {
            const { mapService } = testServiceSetup();

            mapService['trackBuildingCodeDisplay'](18);

            const hallBuilding = mapService['outdoorMap'].getPOI(
                testBuildingName
            );

            expect(hallBuilding['buildingLabel'].getVisible()).toBeTruthy;
        });

        it('should not try to display the code of a no building object', () => {
            const { mapService } = testServiceSetup();

            let campusMock = new MockCampus();

            mapService['outdoorMap'] = new OutdoorMap([campusMock]);
            mapService['trackBuildingCodeDisplay'](20);

            expect(campusMock.removeCodeCalled).toBeFalsy();
            expect(campusMock.displayCodeCalled).toBeFalsy();
        });
    });
    class MockElementRef extends ElementRef {
        nativeElement = {};
    }

    it('get renderer api', () => {
        const {
            mapService,
            locationServiceSpy,
            googleApisServiceSpy
        } = testServiceSetup();

        mapService.getMapRenderer();
        expect(googleApisServiceSpy.getMapRenderer).toHaveBeenCalled();
    });

    describe('loadIndoorMaps()', () => {
        it("should return indoor maps", () => {
            const { mapService } = testServiceSetup();
            const indoorMaps = mapService.loadIndoorMaps();

            for (const indoorMap in indoorMaps) {
                expect(indoorMap).toBeTruthy();
            }
        });
    });
});
