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
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import {  PlaceService, SessionService } from '../../services';

@Component({
    selector: 'app-search',
    templateUrl: './search.component.html',
    styleUrls: ['./search.component.scss']
})
export class SearchComponent implements OnInit, AfterViewInit, OnChanges, OnDestroy {
    @Input() isMapSet?: boolean;
    @Input() showSearchIcon = true;
    @Input() placeholder = 'Search';
    @Input() colorPrimary = true;
    @Input() topMargin = false;
    @Output() placeSelection: EventEmitter<
        google.maps.places.PlaceResult
    > = new EventEmitter<google.maps.places.PlaceResult>();
    @Output() cancelSelection: EventEmitter<any> = new EventEmitter();
    @Output() showControls: EventEmitter<any> = new EventEmitter();
    @Output() removeControls: EventEmitter<any> = new EventEmitter();

    showSearchOverlay = false;
    searching = false;
    searchResultsArray: google.maps.places.PlaceResult[];
    resultFound = false;
    searchInput: FormControl = new FormControl();
    onDestroy = new Subject<void>();
    map: google.maps.Map;

    constructor(
        private placeService: PlaceService,
        private sessionService: SessionService
    ) {}

    ngOnInit() {
        this.searchInput.valueChanges
            .pipe(takeUntil((this.onDestroy = new Subject<void>())))
            .subscribe(() => {
                this.search();
            });
    }

    ngAfterViewInit() {
        this.loadMap();
    }

    ngOnDestroy() {
        this.onDestroy.next();
        this.onDestroy.complete();
    }
    
    ngOnChanges(changes: SimpleChanges) {
        if (changes.isMapSet && changes.isMapSet.currentValue) {
            this.loadMap();
        }
    }

    loadMap() {
        if (this.sessionService.isMapRefSet()) {
            this.map = this.sessionService.getMapRef();
        }
    }
    /**
     * Call searchPOIs function based on input size
     *
     */
    search(): void {
        const input = this.searchInput.value;

        // Reset search when input is empty
        if (!input || input.length === 0) {
            this.restoreSearchBar();
        } else {
            // Only call search function when input is size 3
            // or larger to help preserve resources (Library is not free)
            if (input.length >= 3) {
                this.showSearchOverlay = true;
                this.searchPOIs(input);
                this.removeControls.emit();
            }
        }
    }

    /**
     * Call textSearch function from placeService
     * @param input text input from the user
     */
    async searchPOIs(input: string): Promise<any> {
        this.searching = true;
        try {
            this.placeService
                .textSearch(this.map, input)
                .then((res: google.maps.places.PlaceResult[]) =>
                    this.handleSearchForPOIs(res)
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
    private handleSearchForPOIs(res: google.maps.places.PlaceResult[]): void {
        if (res.length > 0) {
            this.searchResultsArray = res;
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
    focusPOI(place: google.maps.places.PlaceResult): void {
        this.searchInput.setValue(place.name);
        this.restoreSearchBar();
        this.cancelSelection.emit();
        this.placeSelection.emit(place);
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
