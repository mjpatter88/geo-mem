import { TestBed } from '@angular/core/testing';

import { Spatial } from './spatial';

describe('Spatial', () => {
  let service: Spatial;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Spatial);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
