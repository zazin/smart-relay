const { handleRequest } = require('../src/request-handlers');
const { handleMissingDestination } = require('../src/error-handlers');
const { forwardRequest } = require('../src/proxy');

// Mock dependencies
jest.mock('../src/error-handlers', () => ({
  handleMissingDestination: jest.fn()
}));

jest.mock('../src/proxy', () => ({
  forwardRequest: jest.fn()
}));

describe('Request Handlers', () => {
  let req, res;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Create mock request and response objects
    req = {
      headers: {},
      url: '/test-path'
    };
    
    res = {
      writeHead: jest.fn(),
      end: jest.fn()
    };
  });

  test('should call handleMissingDestination when x-destination-url header is missing', () => {
    // Arrange
    req.headers['x-destination-url'] = undefined;
    
    // Act
    handleRequest(req, res);
    
    // Assert
    expect(handleMissingDestination).toHaveBeenCalledWith(req, res);
    expect(forwardRequest).not.toHaveBeenCalled();
  });

  test('should call forwardRequest when x-destination-url header is present', () => {
    // Arrange
    const destinationUrl = 'https://example.com';
    req.headers['x-destination-url'] = destinationUrl;
    
    // Act
    handleRequest(req, res);
    
    // Assert
    expect(forwardRequest).toHaveBeenCalledWith(req, res, destinationUrl);
    expect(handleMissingDestination).not.toHaveBeenCalled();
  });
});