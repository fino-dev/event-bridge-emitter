package plugin

import (
	"context"
	"errors"
	"net/http"
	"testing"

	"github.com/aws/smithy-go"
	smithyhttp "github.com/aws/smithy-go/transport/http"
)

func TestEventBridgeRequestErrorShowsServiceError(t *testing.T) {
	status, result := eventBridgeRequestError(&smithy.GenericAPIError{
		Code:    "AccessDeniedException",
		Message: "not authorized to perform events:PutEvents",
		Fault:   smithy.FaultClient,
	})

	if status != http.StatusBadGateway {
		t.Fatalf("status = %d, want %d", status, http.StatusBadGateway)
	}
	if result.Status != "failed" {
		t.Fatalf("status result = %q, want failed", result.Status)
	}
	if result.ErrorCode != "AccessDeniedException" {
		t.Fatalf("error code = %q", result.ErrorCode)
	}
	if result.Message != "EventBridge rejected the request (AccessDeniedException): not authorized to perform events:PutEvents" {
		t.Fatalf("message = %q", result.Message)
	}
}

func TestEventBridgeRequestErrorMarksTimeoutAsUnknown(t *testing.T) {
	status, result := eventBridgeRequestError(context.DeadlineExceeded)

	if status != http.StatusGatewayTimeout {
		t.Fatalf("status = %d, want %d", status, http.StatusGatewayTimeout)
	}
	if result.Status != "unknown" {
		t.Fatalf("status result = %q, want unknown", result.Status)
	}
	if result.ErrorCode != "" || result.ErrorMessage != "" {
		t.Fatalf("unexpected error details: %+v", result)
	}
	if result.Message != "EventBridge did not respond before the request timed out. The event may have been accepted. Check EventBridge before retrying." {
		t.Fatalf("message = %q", result.Message)
	}
}

func TestEventBridgeRequestErrorMarksConnectionFailureAsUnknown(t *testing.T) {
	status, result := eventBridgeRequestError(&smithyhttp.RequestSendError{Err: errors.New("connection reset")})

	if status != http.StatusBadGateway {
		t.Fatalf("status = %d, want %d", status, http.StatusBadGateway)
	}
	if result.Status != "unknown" {
		t.Fatalf("status result = %q, want unknown", result.Status)
	}
	if result.Message != "The connection to EventBridge failed before the result was confirmed. The event may have been accepted. Check EventBridge before retrying." {
		t.Fatalf("message = %q", result.Message)
	}
}

func TestEventBridgeRequestErrorDoesNotCallDefinitiveErrorsUnknown(t *testing.T) {
	status, result := eventBridgeRequestError(errors.New("request serialization failed"))

	if status != http.StatusBadGateway {
		t.Fatalf("status = %d, want %d", status, http.StatusBadGateway)
	}
	if result.Status != "failed" {
		t.Fatalf("status result = %q, want failed", result.Status)
	}
	if result.Message != "Could not send the event to EventBridge: request serialization failed" {
		t.Fatalf("message = %q", result.Message)
	}
}

func TestFormatEventBridgeError(t *testing.T) {
	tests := []struct {
		name    string
		code    string
		message string
		want    string
	}{
		{
			name:    "code and message",
			code:    "InternalException",
			message: "service unavailable",
			want:    "EventBridge rejected the event (InternalException): service unavailable",
		},
		{
			name: "empty details",
			want: "EventBridge rejected the event",
		},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			if got := formatEventBridgeError("EventBridge rejected the event", test.code, test.message); got != test.want {
				t.Fatalf("message = %q, want %q", got, test.want)
			}
		})
	}
}
