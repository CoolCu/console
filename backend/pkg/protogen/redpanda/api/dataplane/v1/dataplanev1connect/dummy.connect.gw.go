// Code generated by protoc-gen-connect-gateway. DO NOT EDIT.
//
// Source: redpanda/api/dataplane/v1/dummy.proto

package dataplanev1connect

import (
	context "context"
	fmt "fmt"

	runtime "github.com/grpc-ecosystem/grpc-gateway/v2/runtime"
	connect_gateway "go.vallahaye.net/connect-gateway"
	emptypb "google.golang.org/protobuf/types/known/emptypb"

	v1 "github.com/redpanda-data/console/backend/pkg/protogen/redpanda/api/dataplane/v1"
)

// DummyServiceGatewayServer implements the gRPC server API for the DummyService service.
type DummyServiceGatewayServer struct {
	v1.UnimplementedDummyServiceServer
	dummyMethod connect_gateway.UnaryHandler[emptypb.Empty, v1.DummyMethodResponse]
}

// NewDummyServiceGatewayServer constructs a Connect-Gateway gRPC server for the DummyService
// service.
func NewDummyServiceGatewayServer(svc DummyServiceHandler, opts ...connect_gateway.HandlerOption) *DummyServiceGatewayServer {
	return &DummyServiceGatewayServer{
		dummyMethod: connect_gateway.NewUnaryHandler(DummyServiceDummyMethodProcedure, svc.DummyMethod, opts...),
	}
}

func (s *DummyServiceGatewayServer) DummyMethod(ctx context.Context, req *emptypb.Empty) (*v1.DummyMethodResponse, error) {
	return s.dummyMethod(ctx, req)
}

// RegisterDummyServiceHandlerGatewayServer registers the Connect handlers for the DummyService
// "svc" to "mux".
func RegisterDummyServiceHandlerGatewayServer(mux *runtime.ServeMux, svc DummyServiceHandler, opts ...connect_gateway.HandlerOption) {
	if err := v1.RegisterDummyServiceHandlerServer(context.TODO(), mux, NewDummyServiceGatewayServer(svc, opts...)); err != nil {
		panic(fmt.Errorf("connect-gateway: %w", err))
	}
}
