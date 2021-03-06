import {
    AfterViewInit,
    Component,
    EventEmitter,
    Input,
    OnChanges,
    OnDestroy,
    OnInit,
    Output,
    SimpleChanges,
} from '@angular/core';
import { FormControl } from '@angular/forms';
import { Subscription } from 'rxjs';
import { IndoorFunctionsService } from 'src/app/shared/indoor-functions.service';
import * as indoorPoiToCoordinates from '../../data/indoor-poi-to-coordinates.json';
import { Coordinates, IndoorCoordinates, } from '../../models';
import { PlaceService, SessionService } from '../../services';


@Component({
    selector: 'app-search',
    templateUrl: './search.component.html',
    styleUrls: ['./search.component.scss']
})
export class SearchComponent implements OnInit, AfterViewInit, OnChanges, OnDestroy {

    private moduleKey = 'default';
    private indoorPoiToCoords: IndoorCoordinates = indoorPoiToCoordinates[this.moduleKey];
    isIndoorPoi = false;
    searchIndoorResult: string[];

    /**
     * Defines if the map is set or not
     *
     * @type {boolean}
     */
    @Input() isMapSet?: boolean;

    /**
     * Decides whether or not to show the search icon in the component
     *
     */
    @Input() showSearchIcon = true;

    /**
     * Value of the placeholder
     *
     */
    @Input() placeholder = 'Search';

    /**
     * Sets the color of the search bar
     *
     */
    @Input() colorPrimary = true;

    /**
     * Adds margin to the top of the overlay
     *
     */
    @Input() topMargin = false;

    /**
     * Initial value of the input
     *
     */
    @Input() value: string; 

    /**
     * Emits a place result to the parent component
     *
     * @type {EventEmitter<
     *         google.maps.places.PlaceResult
     *     >}
     */
    @Output() placeSelection: EventEmitter<
        google.maps.places.PlaceResult
    > = new EventEmitter<google.maps.places.PlaceResult>();

    /**
     * Emits a cancel event 
     *
     */
    @Output() cancelSelection: EventEmitter<any> = new EventEmitter();

    /**
     * Tells the parent component to show the controls when overlay is not displayed
     *
     */
    @Output() showControls: EventEmitter<any> = new EventEmitter();

    /**
     * Tells the parent component to remove the controls when overlay is  displayed
     *
     */
    @Output() removeControls: EventEmitter<any> = new EventEmitter();

    /**
     * Set to true when user searches
     *
     */
    showSearchOverlay = false;

    /**
     * Set to true during call for text search
     *
     */
    searching = false;

    /**
     * Result from places api
     *
     */
    searchResultsArray: google.maps.places.PlaceResult[];

    /**
     * Set to true when result is found for given input
     *
     */
    resultFound = false;

    /**
     * Form control for the search input
     *
     * @type {FormControl}
     */
    searchInput: FormControl = new FormControl();

    /**
     * Map object to use with places api
     *
     * @type {google.maps.Map}
     */
    map: google.maps.Map;

    /**
     *
     *
     * @private
     * @type {Subscription}
     */
    private subscription: Subscription;

    constructor(
        private placeService: PlaceService,
        private sessionService: SessionService,
        private indoorFunctionsService: IndoorFunctionsService
    ) { }

    ngOnInit() {
        if (this.value) {
            this.searchInput.setValue(this.value);
        }
        this.subscription = this.searchInput.valueChanges
            .subscribe(() => {
                this.search();
            });
    }

    ngAfterViewInit() {
        // loads the map object
        this.loadMap();
    }

    ngOnDestroy() {
        this.subscription.unsubscribe();
    }

    ngOnChanges(changes: SimpleChanges) {
        if (changes.isMapSet && changes.isMapSet.currentValue) {
            // loads map again whenever isMapSet is changed and set to true
            this.loadMap();
        }
    }

    /**
     * Gets the map object
     *
     */
    loadMap(): void {
        if (this.sessionService.isMapRefSet()) {
            this.map = this.sessionService.getMapRef();
        }
    }
    /**
     * Call searchPOIs function based on input size
     *
     */
    search(): void {
        const input: string = this.searchInput.value;
        // Reset search when input is empty
        if (!input || input.length === 0) {
            this.restoreSearchBar();
        } else {
            // first search the json to see if the user is searching for an indoor classroom
            const matchingIndoorPois: string[] = this.getMatchingIndoorPois(input.toUpperCase());
            if (matchingIndoorPois.length) {
                this.showSearchOverlay = true;
                this.isIndoorPoi = true;
                this.handleSearchForIndoorPOIs(matchingIndoorPois.slice(0, 5));
                this.removeControls.emit();
            }
            // Only call search function when input is size 3
            // or larger to help preserve resources (Library is not free)
            else if (input.length >= 3) {
                this.showSearchOverlay = true;
                this.isIndoorPoi = false;
                this.searchOutdoorPOIs(input);
                this.removeControls.emit();
            }
        }
    }

    private getMatchingIndoorPois(input: string): string[] {
        // Filter all indoor pois to match against classroom names e.g. H815.
        const classRoomRegex: RegExp = /^\w+\d+$/;
        // Filter all indoor pois to match against officeroom names e.g. H961-1.
        const officeRoomRegex: RegExp = /^\w+\d+-\d+$/;
        // Filter for indoor pois to match against user input.
        const regex: RegExp = new RegExp('^' + input);
        return Object.keys(this.indoorPoiToCoords)
            .filter(coord => (classRoomRegex.test(coord) || officeRoomRegex.test(coord)) && regex.test(coord));
    }

    /**
     * Call textSearch function from placeService
     * @param input text input from the user
     */
    searchOutdoorPOIs(input: string): void {
        this.searching = true;
        try {
            this.placeService
                .textSearch(this.map, input)
                .then((res: google.maps.places.PlaceResult[]) =>
                    this.handleSearchForOutdoorPOIs(res)
                )
                .catch(error => this.handleSearchForPOIsError(error));
        } catch {
            console.log('Something went wrong, please refresh application.');
        }
    }

    /**
     * Handles valid result received from place service text search function
     * @param res Array of Google PlaceResult objects
     */
    private handleSearchForOutdoorPOIs(res: google.maps.places.PlaceResult[]): void {
        if (res.length > 0) {
            this.searchResultsArray = res;
            this.resultFound = true;
        } else {
            this.resultFound = false;
        }
        this.searching = false;
    }


    /**
     * Handles valid result received from place service text search function
     * @param value Array of Indoor Pois
     */
    private handleSearchForIndoorPOIs(value: string[]): void {
        this.searching = true;
        if (value.length > 0) {
            this.searchIndoorResult = value;
            this.resultFound = true;
        } else {
            this.resultFound = false;
        }
        this.searching = false;
    }


    /**
     * Handles any error received from place service text search function
     * @param error Error response
     */
    private handleSearchForPOIsError(error: any): void {
        console.log(error); //debug
        this.resultFound = false;
        this.searching = false;
    }

    /**
     * Restore search bar and
     * @param place Google Place Result Object
     */
    focusOutdoorPOI(place: google.maps.places.PlaceResult): void {
        this.searchInput.setValue(place.name);
        this.restoreSearchBar();
        this.cancelSelection.emit();
        this.placeSelection.emit(place);
    }

    /**
     * Restore search bar and
     * @param place Google Place Result Object
     */
    focusIndoorPOI(place: string): void {
        this.searchInput.setValue(place);
        this.restoreSearchBar();
        this.cancelSelection.emit();

        const validCoordinate: boolean = this.indoorFunctionsService.coordinateIsIndoors(place);

        if (validCoordinate) {

            const coordinate: Coordinates = this.indoorFunctionsService.getIndoorCoordinate(place);

            const googlePlace = {
                name: place,
                formatted_address: place,
                geometry: {
                    location: new google.maps.LatLng(coordinate.getLatitude(), coordinate.getLongitude()),
                    viewport: null,
                }
            } as google.maps.places.PlaceResult;

            this.placeSelection.emit(googlePlace);
        }
    }

    /**
     * Restores initial state of the search bar and
     * re-displays the home page controls
     */
    restoreSearchBar(): void {
        this.searchResultsArray = [];
        this.showSearchOverlay = false;
        this.searching = false;
        this.showControls.emit();
    }

    /**
     * Resets form input and calls
     * restoreSearchBar function
     */
    cancelSearch(): void {
        this.searchInput.reset();
        this.restoreSearchBar();
        this.cancelSelection.emit();
    }
}
