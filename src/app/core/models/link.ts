import { Coordinates } from './coordinates';
import { IndoorPOI } from './indoor-poi';
import { LinkType } from './link-type';

export class Link extends IndoorPOI {

    private linkType: LinkType;
    private exitCoordinates: Coordinates[];
    
    constructor(name: string,
                coordinates: Coordinates,
                iconPath: string,
                linkType: string,
                exitCoordinates: Coordinates[]
                ) {
        super(name, coordinates, iconPath);
        this.exitCoordinates = exitCoordinates;
        this.setLinkType(linkType);
    }

    getExitCoordinates(): Coordinates[] {
        return this.exitCoordinates;
    }

    getLinkType(): LinkType {
        return this.linkType;
    }

    private setLinkType(linkType: string): void {
        this.linkType = new LinkType(linkType);
    }
}
