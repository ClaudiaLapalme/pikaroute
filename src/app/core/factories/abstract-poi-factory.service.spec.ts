import { AbstractPOIFactoryService } from './abstract-poi-factory.service';
import { OutdoorPOIFactoryService } from './outdoor-poi-factory.service';
import { IndoorPOIFactoryService } from './indoor-poi-factory.service';

describe('AbstractPoiFactoryService', () => {

    function testServiceSetup() {
        const mockMapService = jasmine.createSpyObj('mapService', ['loadIndoorMaps']);
        const abstractPOIFactoryService: AbstractPOIFactoryService = new AbstractPOIFactoryService();
        return { abstractPOIFactoryService, mockMapService };
    }

    it('should be created', () => {
        const abstractPOIFactory = testServiceSetup();
        expect(abstractPOIFactory).toBeTruthy();
    });

    describe('createOutdoorPOIFactory()', () => {

        it('should return an outdoor poi factory', () => {
            const { abstractPOIFactoryService, mockMapService } = testServiceSetup();
            const outdoorPOIFactory = abstractPOIFactoryService.createOutdoorPOIFactory();

            expect(outdoorPOIFactory).toEqual(new OutdoorPOIFactoryService());
        });
    });

    describe('createOutdoorPOIFactory()', () => {

      it('should return an indoor poi factory', () => {
          const { abstractPOIFactoryService } = testServiceSetup();
          const indoorPOIFactory = abstractPOIFactoryService.createIndoorPOIFactory();

          expect(indoorPOIFactory).toEqual(new IndoorPOIFactoryService());
      });
  });
});